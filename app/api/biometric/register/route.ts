import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const registerBiometricSchema = z.object({
  userId: z.string().uuid(),
  faceHash: z.string(),
  irisHash: z.string(),
  fingerprintHash: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, faceHash, irisHash, fingerprintHash } = registerBiometricSchema.parse(body);

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: existing } = await supabaseAdmin
      .from("biometric_auth")
      .select("*")
      .eq("user_id", userId)
      .single();

    const biometricData = {
      user_id: userId,
      face_hash: faceHash,
      iris_hash: irisHash,
      fingerprint_hash: fingerprintHash,
      face_verified: true,
      iris_verified: true,
      fingerprint_verified: true,
      verified_at: new Date().toISOString(),
    };

    if (existing) {
      await supabaseAdmin
        .from("biometric_auth")
        .update(biometricData)
        .eq("user_id", userId);
    } else {
      await supabaseAdmin
        .from("biometric_auth")
        .insert(biometricData);
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "biometric_registration",
      details: { all_verified: true },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({
      message: "Biometric registration successful",
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
