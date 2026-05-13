import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const verifySchema = z.object({
  userId: z.string(),
  biometricType: z.enum(["face", "iris", "fingerprint"]),
  verified: z.boolean(),
  embedding: z.unknown().optional(),
  quality: z.number().min(0).max(1).optional(),
  embeddingVersion: z.string().optional(),
  pcaVersion: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, biometricType, verified, embedding, quality, embeddingVersion, pcaVersion } =
      verifySchema.parse(body);

    const existing = await prisma.biometricAuth.findUnique({
      where: { userId },
    });

    const nextFaceVerified = biometricType === "face" ? verified : (existing?.faceVerified ?? false);
    const nextIrisVerified = biometricType === "iris" ? verified : (existing?.irisVerified ?? false);
    const nextFingerprintVerified =
      biometricType === "fingerprint" ? verified : (existing?.fingerprintVerified ?? false);

    const allDone = nextFaceVerified && nextIrisVerified && nextFingerprintVerified;

    const updateData: Record<string, unknown> = {
      faceVerified: nextFaceVerified,
      irisVerified: nextIrisVerified,
      fingerprintVerified: nextFingerprintVerified,
      verifiedAt: allDone ? new Date() : undefined,
      ...(embeddingVersion ? { embeddingVersion } : {}),
      ...(pcaVersion ? { pcaVersion } : {}),
    };

    if (biometricType === "face") {
      if (embedding !== undefined && embedding !== null) updateData.faceEmbedding = embedding;
      if (quality !== undefined) updateData.faceQuality = quality;
    } else if (biometricType === "iris") {
      if (embedding !== undefined && embedding !== null) updateData.irisEmbedding = embedding;
      if (quality !== undefined) updateData.irisQuality = quality;
    } else {
      if (embedding !== undefined && embedding !== null) updateData.fingerprintEmbedding = embedding;
      if (quality !== undefined) updateData.fingerprintQuality = quality;
    }

    await prisma.biometricAuth.upsert({
      where: { userId },
      create: {
        userId,
        faceVerified: nextFaceVerified,
        irisVerified: nextIrisVerified,
        fingerprintVerified: nextFingerprintVerified,
        verifiedAt: allDone ? new Date() : null,
        ...(embeddingVersion ? { embeddingVersion } : {}),
        ...(pcaVersion ? { pcaVersion } : {}),
        ...(biometricType === "face" && embedding !== undefined && embedding !== null
          ? { faceEmbedding: embedding }
          : {}),
        ...(biometricType === "face" && quality !== undefined ? { faceQuality: quality } : {}),
        ...(biometricType === "iris" && embedding !== undefined && embedding !== null
          ? { irisEmbedding: embedding }
          : {}),
        ...(biometricType === "iris" && quality !== undefined ? { irisQuality: quality } : {}),
        ...(biometricType === "fingerprint" && embedding !== undefined && embedding !== null
          ? { fingerprintEmbedding: embedding }
          : {}),
        ...(biometricType === "fingerprint" && quality !== undefined
          ? { fingerprintQuality: quality }
          : {}),
      },
      update: updateData,
    });

    await writeAuditLog({
      userId,
      action: `biometric_verification_${biometricType}`,
      category: "SECURITY",
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
