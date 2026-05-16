import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const registerBiometricSchema = z.object({
  userId: z.string(),
  faceEmbedding: z.unknown().optional(),
  irisEmbedding: z.unknown().optional(),
  fingerprintEmbedding: z.unknown().optional(),
  faceQuality: z.number().min(0).max(1).optional(),
  irisQuality: z.number().min(0).max(1).optional(),
  fingerprintQuality: z.number().min(0).max(1).optional(),
  embeddingVersion: z.string().optional(),
  pcaVersion: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      faceEmbedding,
      irisEmbedding,
      fingerprintEmbedding,
      faceQuality,
      irisQuality,
      fingerprintQuality,
      embeddingVersion,
      pcaVersion,
    } = registerBiometricSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.biometricAuth.upsert({
      where: { userId },
      create: {
        userId,
        ...(faceEmbedding !== undefined && faceEmbedding !== null ? { faceEmbedding } : {}),
        ...(irisEmbedding !== undefined && irisEmbedding !== null ? { irisEmbedding } : {}),
        ...(fingerprintEmbedding !== undefined && fingerprintEmbedding !== null
          ? { fingerprintEmbedding }
          : {}),
        faceQuality: faceQuality ?? null,
        irisQuality: irisQuality ?? null,
        fingerprintQuality: fingerprintQuality ?? null,
        faceVerified: false,
        irisVerified: false,
        fingerprintVerified: false,
        verifiedAt: null,
        ...(embeddingVersion ? { embeddingVersion } : {}),
        ...(pcaVersion ? { pcaVersion } : {}),
      },
      update: {
        ...(faceEmbedding !== undefined && faceEmbedding !== null ? { faceEmbedding } : {}),
        ...(irisEmbedding !== undefined && irisEmbedding !== null ? { irisEmbedding } : {}),
        ...(fingerprintEmbedding !== undefined && fingerprintEmbedding !== null
          ? { fingerprintEmbedding }
          : {}),
        ...(faceQuality !== undefined ? { faceQuality } : {}),
        ...(irisQuality !== undefined ? { irisQuality } : {}),
        ...(fingerprintQuality !== undefined ? { fingerprintQuality } : {}),
        ...(embeddingVersion ? { embeddingVersion } : {}),
        ...(pcaVersion ? { pcaVersion } : {}),
      },
    });

    // Optional: keep latest active sample per modality as well.
    const samples: Array<{
      modality: "face" | "iris" | "fingerprint";
      embedding: unknown;
      quality?: number;
    }> = [];
    if (faceEmbedding !== undefined) samples.push({ modality: "face", embedding: faceEmbedding, quality: faceQuality });
    if (irisEmbedding !== undefined) samples.push({ modality: "iris", embedding: irisEmbedding, quality: irisQuality });
    if (fingerprintEmbedding !== undefined)
      samples.push({ modality: "fingerprint", embedding: fingerprintEmbedding, quality: fingerprintQuality });

    await Promise.all(
      samples.map((s) =>
        prisma.biometricSample.upsert({
          where: {
            userId_modality_isActive: { userId, modality: s.modality, isActive: true },
          },
          create: {
            userId,
            modality: s.modality,
            embedding: s.embedding as never,
            quality: s.quality ?? null,
            isActive: true,
          },
          update: {
            embedding: s.embedding as never,
            quality: s.quality ?? null,
          },
        })
      )
    );

    await writeAuditLog({
      userId,
      action: "biometric_registration",
      category: "SECURITY",
      details: { templates_registered: true },
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
