import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(["patient", "doctor", "nurse", "admin"]).default("patient"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = registerSchema.parse(body);

    const user = await createUser(email, password, name, role);

    if (!user) {
      return NextResponse.json(
        { error: "Email already exists or registration failed" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Registration successful", user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
