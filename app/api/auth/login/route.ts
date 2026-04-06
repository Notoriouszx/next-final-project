import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    if (user.role === "doctor" || user.role === "nurse" || user.role === "admin") {
      const { data: biometric } = await supabaseAdmin
        .from("biometric_auth")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!biometric || !biometric.face_verified || !biometric.iris_verified || !biometric.fingerprint_verified) {
        return NextResponse.json(
          {
            requiresBiometric: true,
            userId: user.id,
            message: "Biometric verification required"
          },
          { status: 200 }
        );
      }
    }

    const sessionToken = await createSession(user.id);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action: "login",
      details: { role: user.role },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
