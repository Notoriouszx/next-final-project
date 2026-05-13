import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import type { NextRequest } from "next/server";

export type BiometricModality = "face" | "iris" | "fingerprint";

export type BiometricImagePayload = {
  user_id: string;
  face_image?: string | null;
  iris_image?: string | null;
  fingerprint_image?: string | null;
};

function getApiBase() {
  const url = process.env.BIOMETRIC_API_URL;
  if (!url) {
    throw new Error("BIOMETRIC_API_URL is not set");
  }
  return url.replace(/\/+$/, "");
}

/**
 * Prefer a full URL (Vercel env: BIOMETRIC_VERIFY_URL).
 * Otherwise BIOMETRIC_API_URL + BIOMETRIC_VERIFY_PATH (path must include leading /).
 */
export function resolveBiometricVerifyUrl(): string {
  const full = process.env.BIOMETRIC_VERIFY_URL?.trim();
  if (full) {
    return full.replace(/\/+$/, "");
  }
  const base = getApiBase();
  const path = process.env.BIOMETRIC_VERIFY_PATH?.trim();
  if (!path) {
    throw new Error(
      "Set BIOMETRIC_VERIFY_URL to your verification endpoint full URL (e.g. https://your-service.com/api/verify), " +
        "or set BIOMETRIC_VERIFY_PATH (e.g. /api/biometric/verify) together with BIOMETRIC_API_URL. " +
        "The placeholder paths /verify and /api/verify are not deployed on your current Render service."
    );
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export function buildPayloadForModality(
  userId: string,
  modality: BiometricModality,
  dataUrl: string
): BiometricImagePayload {
  const base: BiometricImagePayload = {
    user_id: userId,
    face_image: null,
    iris_image: null,
    fingerprint_image: null,
  };
  if (modality === "face") base.face_image = dataUrl;
  if (modality === "iris") base.iris_image = dataUrl;
  if (modality === "fingerprint") base.fingerprint_image = dataUrl;
  return base;
}

export function buildPayloadFromImages(input: {
  userId: string;
  face_image?: string | null;
  iris_image?: string | null;
  fingerprint_image?: string | null;
}): BiometricImagePayload {
  return {
    user_id: input.userId,
    face_image: input.face_image ?? null,
    iris_image: input.iris_image ?? null,
    fingerprint_image: input.fingerprint_image ?? null,
  };
}

export async function postBiometricVerifyJson(payload: BiometricImagePayload): Promise<Response> {
  const url = resolveBiometricVerifyUrl();
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
}

function parseUpstreamJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function interpretVerifyResponse(res: Response, json: unknown, text: string) {
  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const verified =
    typeof o.verified === "boolean"
      ? o.verified
      : typeof o.success === "boolean"
        ? (o.success as boolean)
        : res.ok;

  const confidence = typeof o.confidence === "number" ? o.confidence : null;
  const quality = typeof o.quality === "number" ? o.quality : null;
  const embedding = o.embedding ?? o.template ?? null;

  return { verified, confidence, quality, embedding, raw: json ?? text };
}

type PersistOpts = {
  userId: string;
  modality?: BiometricModality;
  /** If true, apply the same verified flag to face, iris, and fingerprint */
  allModalities?: boolean;
  verified: boolean;
  confidence: number | null;
  quality: number | null;
  embedding: unknown;
  responseTimeMs: number;
  request: NextRequest;
  auditAction: string;
  upstreamUrl: string;
  upstreamStatus: number;
  filesCount?: number;
};

export async function persistBiometricVerification(opts: PersistOpts) {
  const {
    userId,
    modality,
    allModalities,
    verified,
    confidence,
    quality,
    embedding,
    responseTimeMs,
    request,
    auditAction,
    upstreamUrl,
    upstreamStatus,
    filesCount,
  } = opts;

  const ipAddress = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");

  await prisma.biometricAttempt.create({
    data: {
      userId,
      success: verified,
      confidence: confidence ?? undefined,
      modalityUsed: allModalities ? "fusion" : (modality ?? "fusion"),
      responseTime: responseTimeMs,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
      errorMessage: upstreamStatus >= 400 ? `upstream:${upstreamStatus}` : undefined,
    },
  });

  const updateOneModality = async (m: BiometricModality) => {
    const internalUrl = new URL("/api/biometric/verify", request.url);
    const body: Record<string, unknown> = {
      userId,
      biometricType: m,
      verified,
      ...(quality !== null ? { quality } : {}),
      ...(embedding !== null && embedding !== undefined ? { embedding } : {}),
    };
    await fetch(internalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (embedding !== null && embedding !== undefined) {
      await prisma.biometricSample.upsert({
        where: {
          userId_modality_isActive: { userId, modality: m, isActive: true },
        },
        create: {
          userId,
          modality: m,
          embedding: embedding as never,
          quality: quality ?? null,
          isActive: true,
        },
        update: {
          embedding: embedding as never,
          quality: quality ?? null,
        },
      });
    }
  };

  if (allModalities) {
    const nextAll = verified;
    const allDone = nextAll;
    await prisma.biometricAuth.upsert({
      where: { userId },
      create: {
        userId,
        faceVerified: nextAll,
        irisVerified: nextAll,
        fingerprintVerified: nextAll,
        verifiedAt: allDone ? new Date() : null,
      },
      update: {
        faceVerified: nextAll,
        irisVerified: nextAll,
        fingerprintVerified: nextAll,
        verifiedAt: allDone ? new Date() : undefined,
      },
    });
  } else if (modality) {
    await updateOneModality(modality);
  }

  await writeAuditLog({
    userId,
    action: auditAction,
    category: "SECURITY",
    details: {
      verified,
      upstream: upstreamUrl,
      upstreamStatus,
      ...(filesCount !== undefined ? { files: filesCount } : {}),
    },
    ipAddress,
    userAgent,
  });
}

export async function runExternalJsonVerify(
  payload: BiometricImagePayload,
  request: NextRequest,
  opts: {
    modality?: BiometricModality;
    allModalities?: boolean;
    auditAction: string;
    filesCount?: number;
  }
) {
  const started = Date.now();
  const upstreamUrl = resolveBiometricVerifyUrl();
  const res = await postBiometricVerifyJson(payload);
  const text = await res.text();
  const json = parseUpstreamJson(text);
  const responseTimeMs = Date.now() - started;
  const { verified, confidence, quality, embedding, raw } = interpretVerifyResponse(res, json, text);

  await persistBiometricVerification({
    userId: payload.user_id,
    modality: opts.modality,
    allModalities: opts.allModalities,
    verified,
    confidence,
    quality,
    embedding,
    responseTimeMs,
    request,
    auditAction: opts.auditAction,
    upstreamUrl,
    upstreamStatus: res.status,
    filesCount: opts.filesCount,
  });

  return { res, verified, confidence, quality, embedding, raw, upstreamUrl };
}
