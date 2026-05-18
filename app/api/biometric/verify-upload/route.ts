import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildPayloadFromImages,
  evaluateBiometricVerifyResult,
  fileToDataUrl,
  runExternalJsonVerify,
} from "@/lib/biometric-verify-service";
import { validateBiometricUploadFile } from "@/lib/biometric-image-validation";

const formSchema = z.object({
  userId: z.string().min(1),
});

type Modality = "face" | "iris" | "fingerprint";

const MODALITY_FIELDS: Record<Modality, "face_image" | "iris_image" | "fingerprint_image"> = {
  face: "face_image",
  iris: "iris_image",
  fingerprint: "fingerprint_image",
};

/**
 * Multipart verification: expects userId + optional face | iris | fingerprint files.
 * When all three files are present, sends one fusion request to the Python /api/verify service.
 */
export async function POST(request: NextRequest) {
  try {
    const fd = await request.formData();
    const userId = String(fd.get("userId") ?? "").trim();

    const parsed = formSchema.safeParse({ userId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const images: Partial<Record<"face_image" | "iris_image" | "fingerprint_image", string>> = {};

    for (const modality of ["face", "iris", "fingerprint"] as const) {
      const file = fd.get(modality);
      if (file instanceof File && file.size > 0) {
        const fileCheck = validateBiometricUploadFile(file);
        if (!fileCheck.ok) {
          return NextResponse.json(
            { error: `${modality}: ${fileCheck.error}` },
            { status: 400 }
          );
        }
        images[MODALITY_FIELDS[modality]] = await fileToDataUrl(file);
      }
    }

    const count = Object.keys(images).length;
    if (count === 0) {
      return NextResponse.json({ error: "Provide at least one biometric image file" }, { status: 400 });
    }

    const payload = buildPayloadFromImages({
      userId: parsed.data.userId,
      face_image: images.face_image ?? null,
      iris_image: images.iris_image ?? null,
      fingerprint_image: images.fingerprint_image ?? null,
    });

    const allModalities = count === 3;

    // #region agent log
    fetch("http://127.0.0.1:7440/ingest/e2a01d83-0a9f-476b-8c9e-61fa3d3a3a79", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e23d66" },
      body: JSON.stringify({
        sessionId: "e23d66",
        runId: "verify-upload",
        hypothesisId: "H-batch",
        location: "verify-upload/route.ts:POST",
        message: "verify-upload payload",
        data: { userId: parsed.data.userId, modalities: Object.keys(images), allModalities },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const { res, verified, confidence, raw, upstreamUrl } = await runExternalJsonVerify(payload, request, {
      allModalities,
      auditAction: allModalities ? "biometric_verify_upload_all" : "biometric_verify_upload_partial",
      filesCount: count,
    });

    const evaluated = evaluateBiometricVerifyResult(raw);

    // #region agent log
    fetch("http://127.0.0.1:7440/ingest/e2a01d83-0a9f-476b-8c9e-61fa3d3a3a79", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e23d66" },
      body: JSON.stringify({
        sessionId: "e23d66",
        runId: "verify-strict",
        hypothesisId: "H-scores",
        location: "verify-upload/route.ts:POST:result",
        message: "verify evaluation",
        data: {
          userId: parsed.data.userId,
          upstreamOk: res.ok,
          verified,
          evaluatedVerified: evaluated.verified,
          confidence: evaluated.confidence,
          scores: evaluated.scores,
          upstreamVerified: evaluated.upstreamVerified,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Biometric service error",
          upstream: { url: upstreamUrl, status: res.status, body: raw },
        },
        { status: 502 }
      );
    }

    if (evaluated.qualityRejected) {
      return NextResponse.json(
        {
          verified: false,
          error: evaluated.qualityRejectReason ?? "Biometric quality checks failed",
          confidence: evaluated.confidence,
          scores: evaluated.scores,
          raw,
        },
        { status: 422 }
      );
    }

    if (!allModalities) {
      return NextResponse.json(
        { error: "Submit face, iris, and fingerprint together for verification." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified,
      confidence,
      scores: evaluated.scores,
      raw,
      upstream: { url: upstreamUrl },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isConfig = /BIOMETRIC_VERIFY|BIOMETRIC_API_URL/i.test(message);
    return NextResponse.json({ error: message }, { status: isConfig ? 503 : 500 });
  }
}
