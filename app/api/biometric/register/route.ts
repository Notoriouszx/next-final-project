import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const registerBiometricSchema = z.object({
  userId: z.string(),
  faceHash: z.string(),
  irisHash: z.string(),
  fingerprintHash: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, faceHash, irisHash, fingerprintHash } =
      registerBiometricSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.biometricAuth.findUnique({
      where: { userId },
    });

    const data = {
      faceHash,
      irisHash,
      fingerprintHash,
      faceVerified: true,
      irisVerified: true,
      fingerprintVerified: true,
      verifiedAt: new Date(),
    };

    if (existing) {
      await prisma.biometricAuth.update({
        where: { userId },
        data,
      });
    } else {
      await prisma.biometricAuth.create({
        data: { userId, ...data },
      });
    }

    await writeAuditLog({
      userId,
      action: "biometric_registration",
      details: { all_verified: true },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      message: "Biometric registration successful",
      success: true,
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
