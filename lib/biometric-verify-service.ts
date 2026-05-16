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
export function resolveBiometricEnrollUrl(): string {
  const full = process.env.BIOMETRIC_ENROLL_URL?.trim();
  if (full) {
    return full.replace(/\/+$/, "");
  }
  const base = getApiBase();
  const path = process.env.BIOMETRIC_ENROLL_PATH?.trim() || "/api/v1/enroll";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

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

export type BiometricEnrollPayload = BiometricImagePayload;

export type BiometricEnrollResult = {
  success: boolean;
  user_id?: string;
  message?: string;
  embeddings?: Record<string, number[]>;
};

export async function postBiometricEnrollJson(
  payload: BiometricEnrollPayload
): Promise<{ res: Response; data: BiometricEnrollResult | null; text: string }> {
  const url = resolveBiometricEnrollUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: BiometricEnrollResult | null = null;
  try {
    data = text ? (JSON.parse(text) as BiometricEnrollResult) : null;
  } catch {
    data = null;
  }
  return { res, data, text };
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

export const BIOMETRIC_VERIFY_MIN_CONFIDENCE = 0.85;
export const BIOMETRIC_VERIFY_MIN_MODALITY_SCORE = 0.85;
const REQUIRED_MODALITIES = ["face", "fingerprint", "iris"] as const;

/** Never treat HTTP success / `success: true` as biometric pass. */
export function evaluateBiometricVerifyResult(json: unknown) {
  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const confidence = typeof o.confidence === "number" ? o.confidence : null;
  const scoresRaw = o.scores && typeof o.scores === "object" ? (o.scores as Record<string, unknown>) : {};
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(scoresRaw)) {
    if (typeof v === "number") scores[k] = v;
  }

  const allModalityScoresPresent = REQUIRED_MODALITIES.every((m) => typeof scores[m] === "number");
  const allModalityScoresPass = REQUIRED_MODALITIES.every(
    (m) => (scores[m] ?? 0) >= BIOMETRIC_VERIFY_MIN_MODALITY_SCORE
  );

  const verified =
    o.verified === true &&
    confidence !== null &&
    confidence >= BIOMETRIC_VERIFY_MIN_CONFIDENCE &&
    allModalityScoresPresent &&
    allModalityScoresPass;

  const quality = typeof o.quality === "number" ? o.quality : null;
  const embedding = o.embedding ?? o.template ?? null;

  return {
    verified,
    confidence,
    quality,
    embedding,
    scores,
    upstreamVerified: o.verified === true,
    allModalityScoresPresent,
    allModalityScoresPass,
  };
}

export function interpretVerifyResponse(res: Response, json: unknown, text: string) {
  const evaluated = evaluateBiometricVerifyResult(json);
  return {
    verified: evaluated.verified,
    confidence: evaluated.confidence,
    quality: evaluated.quality,
    embedding: evaluated.embedding,
    raw: json ?? text,
    scores: evaluated.scores,
  };
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

export async function persistBiometricEnrollment(opts: {
  userId: string;
  embeddings: Record<string, number[]>;
  request: NextRequest;
  auditAction?: string;
}) {
  const { userId, embeddings, request, auditAction = "biometric_enrollment" } = opts;
  const ipAddress = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");

  const modalities = Object.keys(embeddings) as BiometricModality[];
  const faceEmbedding = embeddings.face;
  const irisEmbedding = embeddings.iris;
  const fingerprintEmbedding = embeddings.fingerprint;

  // Enrollment stores reference templates only — do not mark login verification complete.
  await prisma.biometricAuth.upsert({
    where: { userId },
    create: {
      userId,
      ...(faceEmbedding ? { faceEmbedding } : {}),
      ...(irisEmbedding ? { irisEmbedding } : {}),
      ...(fingerprintEmbedding ? { fingerprintEmbedding } : {}),
      faceVerified: false,
      irisVerified: false,
      fingerprintVerified: false,
      verifiedAt: null,
    },
    update: {
      ...(faceEmbedding ? { faceEmbedding } : {}),
      ...(irisEmbedding ? { irisEmbedding } : {}),
      ...(fingerprintEmbedding ? { fingerprintEmbedding } : {}),
      faceVerified: false,
      irisVerified: false,
      fingerprintVerified: false,
      verifiedAt: null,
    },
  });

  // #region agent log
  fetch("http://127.0.0.1:7440/ingest/e2a01d83-0a9f-476b-8c9e-61fa3d3a3a79", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e23d66" },
    body: JSON.stringify({
      sessionId: "e23d66",
      runId: "enroll-flags-fix",
      hypothesisId: "H-flags",
      location: "biometric-verify-service.ts:persistBiometricEnrollment",
      message: "enrollment saved; verification flags reset",
      data: { userId, modalities },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  await Promise.all(
    modalities.map((modality) =>
      prisma.biometricSample.upsert({
        where: {
          userId_modality_isActive: { userId, modality, isActive: true },
        },
        create: {
          userId,
          modality,
          embedding: embeddings[modality] as never,
          isActive: true,
        },
        update: {
          embedding: embeddings[modality] as never,
        },
      })
    )
  );

  await writeAuditLog({
    userId,
    action: auditAction,
    category: "SECURITY",
    details: { modalities, verification_reset: true },
    ipAddress,
    userAgent,
  });
}
