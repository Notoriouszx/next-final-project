import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const verifySchema = z.object({
  userId: z.string().uuid(),
  biometricType: z.enum(["face", "iris", "fingerprint"]),
  biometricHash: z.string(),
  verified: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, biometricType, biometricHash, verified } = verifySchema.parse(body);

    const { data: existing } = await supabaseAdmin
      .from("biometric_auth")
      .select("*")
      .eq("user_id", userId)
      .single();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (biometricType === "face") {
      updateData.face_hash = biometricHash;
      updateData.face_verified = verified;
    } else if (biometricType === "iris") {
      updateData.iris_hash = biometricHash;
      updateData.iris_verified = verified;
    } else if (biometricType === "fingerprint") {
      updateData.fingerprint_hash = biometricHash;
      updateData.fingerprint_verified = verified;
    }

    if (existing) {
      await supabaseAdmin
        .from("biometric_auth")
        .update(updateData)
        .eq("user_id", userId);
    } else {
      await supabaseAdmin
        .from("biometric_auth")
        .insert({
          user_id: userId,
          ...updateData,
        });
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: `biometric_verification_${biometricType}`,
      details: { verified, type: biometricType },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({
      message: "Biometric verification updated",
      verified,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
