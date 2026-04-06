import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const verifySchema = z.object({
  userId: z.string(),
  biometricType: z.enum(["face", "iris", "fingerprint"]),
  biometricHash: z.string(),
  verified: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, biometricType, biometricHash, verified } =
      verifySchema.parse(body);

    const existing = await prisma.biometricAuth.findUnique({
      where: { userId },
    });

    const next = {
      faceHash: existing?.faceHash ?? null,
      irisHash: existing?.irisHash ?? null,
      fingerprintHash: existing?.fingerprintHash ?? null,
      faceVerified: existing?.faceVerified ?? false,
      irisVerified: existing?.irisVerified ?? false,
      fingerprintVerified: existing?.fingerprintVerified ?? false,
    };

    if (biometricType === "face") {
      next.faceHash = biometricHash;
      next.faceVerified = verified;
    } else if (biometricType === "iris") {
      next.irisHash = biometricHash;
      next.irisVerified = verified;
    } else {
      next.fingerprintHash = biometricHash;
      next.fingerprintVerified = verified;
    }

    const allDone =
      next.faceVerified && next.irisVerified && next.fingerprintVerified;

    await prisma.biometricAuth.upsert({
      where: { userId },
      create: {
        userId,
        faceHash: next.faceHash,
        irisHash: next.irisHash,
        fingerprintHash: next.fingerprintHash,
        faceVerified: next.faceVerified,
        irisVerified: next.irisVerified,
        fingerprintVerified: next.fingerprintVerified,
        verifiedAt: allDone ? new Date() : null,
      },
      update: {
        faceHash: next.faceHash,
        irisHash: next.irisHash,
        fingerprintHash: next.fingerprintHash,
        faceVerified: next.faceVerified,
        irisVerified: next.irisVerified,
        fingerprintVerified: next.fingerprintVerified,
        verifiedAt: allDone ? new Date() : undefined,
      },
    });

    await writeAuditLog({
      userId,
      action: `biometric_verification_${biometricType}`,
      details: { verified, type: biometricType },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      message: "Biometric verification updated",
      verified,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
