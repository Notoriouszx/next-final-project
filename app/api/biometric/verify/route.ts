import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  buildPayloadFromImages,
  runExternalJsonVerify,
} from "@/lib/biometric-verify-service";

const verifySchema = z.object({
  userId: z.string(),
  biometricType: z.enum(["face", "iris", "fingerprint"]),
  verified: z.boolean(),
  embedding: z.unknown().optional(),
  quality: z.number().min(0).max(1).optional(),
  embeddingVersion: z.string().optional(),
  pcaVersion: z.string().optional(),
});

const imageVerifySchema = z
  .object({
    user_id: z.string().optional(),
    userId: z.string().optional(),
    /** Base64 data URLs or raw base64 strings (non-empty when provided). */
    face_image: z.string().optional(),
    iris_image: z.string().optional(),
    fingerprint_image: z.string().optional(),
  })
  .refine((b) => Boolean((b.user_id ?? b.userId)?.trim()), {
    message: "user_id or userId is required",
    path: ["user_id"],
  });

function bodyHasBiometricImages(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  const s = (v: unknown) => typeof v === "string" && Boolean(v.trim());
  return s(o.face_image) || s(o.iris_image) || s(o.fingerprint_image);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const maybeImages = bodyHasBiometricImages(body) ? imageVerifySchema.safeParse(body) : null;
    if (maybeImages?.success) {
      const p = maybeImages.data;
      const uid = (p.user_id ?? p.userId)!.trim();
      const hasFace = Boolean(p.face_image?.trim());
      const hasIris = Boolean(p.iris_image?.trim());
      const hasFp = Boolean(p.fingerprint_image?.trim());
      const count = [hasFace, hasIris, hasFp].filter(Boolean).length;

      if (count === 0) {
        return NextResponse.json({ error: "Provide at least one biometric image field" }, { status: 400 });
      }
      if (count === 2) {
        return NextResponse.json(
          {
            error:
              "Send exactly one modality per request (face XOR iris XOR fingerprint), or include all three images.",
          },
          { status: 400 }
        );
      }

      const payload = buildPayloadFromImages({
        userId: uid,
        face_image: hasFace ? p.face_image!.trim() : null,
        iris_image: hasIris ? p.iris_image!.trim() : null,
        fingerprint_image: hasFp ? p.fingerprint_image!.trim() : null,
      });

      const allModalities = hasFace && hasIris && hasFp;
      const modality = !allModalities ? (hasFace ? "face" : hasIris ? "iris" : "fingerprint") : undefined;

      const { res, verified, confidence, raw, upstreamUrl } = await runExternalJsonVerify(
        payload,
        request,
        {
          modality,
          allModalities,
          auditAction: allModalities ? "biometric_verify_images_all" : `biometric_verify_images_${modality}`,
        }
      );

      if (!res.ok) {
        return NextResponse.json(
          {
            error: "Biometric service error",
            upstream: { url: upstreamUrl, status: res.status, body: raw },
            hint:
              "Set BIOMETRIC_VERIFY_URL on Vercel to your backend route that accepts JSON with base64/data URL images.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({ verified, confidence, raw });
    }

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
    const message = error instanceof Error ? error.message : "Internal server error";
    const isConfig = /BIOMETRIC_VERIFY|BIOMETRIC_API_URL/i.test(message);
    console.error(error);
    return NextResponse.json({ error: message }, { status: isConfig ? 503 : 500 });
  }
}
