import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  buildPayloadFromImages,
  fileToDataUrl,
  persistBiometricEnrollment,
  postBiometricEnrollJson,
} from "@/lib/biometric-verify-service";
import { enrollUserLocally } from "@/lib/biometric-local-service";

type Modality = "face" | "iris" | "fingerprint";

function inferModality(file: File, fieldName: string): Modality | null {
  const name = `${fieldName} ${file.name}`.toLowerCase();
  if (name.includes("face")) return "face";
  if (name.includes("iris") || name.includes("eye")) return "iris";
  if (name.includes("finger") || name.includes("print")) return "fingerprint";
  return null;
}

export async function POST(request: NextRequest) {
  // #region agent log
  fetch("http://127.0.0.1:7440/ingest/e2a01d83-0a9f-476b-8c9e-61fa3d3a3a79", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e23d66" },
    body: JSON.stringify({
      sessionId: "e23d66",
      runId: "enroll-fix",
      hypothesisId: "H-route",
      location: "admin/biometric-enroll/route.ts:POST:entry",
      message: "flat enroll route hit",
      data: { url: request.url },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  try {
    const fd = await request.formData();
    const userId = String(fd.get("userId") ?? "").trim();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const images: Partial<Record<"face_image" | "iris_image" | "fingerprint_image", string>> = {};
    const unassigned: File[] = [];

    for (const [key, value] of fd.entries()) {
      if (key === "userId") continue;
      if (!(value instanceof File) || value.size === 0) continue;
      const modality =
        (["face", "iris", "fingerprint"] as const).includes(key as Modality)
          ? (key as Modality)
          : inferModality(value, key);
      if (!modality) {
        unassigned.push(value);
        continue;
      }
      const field =
        modality === "face"
          ? "face_image"
          : modality === "iris"
            ? "iris_image"
            : "fingerprint_image";
      images[field] = await fileToDataUrl(value);
    }

    const order: Modality[] = ["face", "iris", "fingerprint"];
    let orderIdx = 0;
    for (const file of unassigned) {
      while (orderIdx < order.length) {
        const m = order[orderIdx++];
        const field =
          m === "face" ? "face_image" : m === "iris" ? "iris_image" : "fingerprint_image";
        if (!images[field]) {
          images[field] = await fileToDataUrl(file);
          break;
        }
      }
    }

    if (Object.keys(images).length === 0) {
      return NextResponse.json(
        {
          error:
            "No biometric files provided. Use fields face, iris, fingerprint or name files accordingly.",
        },
        { status: 400 }
      );
    }

    const payload = buildPayloadFromImages({
      userId,
      face_image: images.face_image ?? null,
      iris_image: images.iris_image ?? null,
      fingerprint_image: images.fingerprint_image ?? null,
    });

    // #region agent log
    fetch("http://127.0.0.1:7440/ingest/e2a01d83-0a9f-476b-8c9e-61fa3d3a3a79", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e23d66" },
      body: JSON.stringify({
        sessionId: "e23d66",
        runId: "enroll-fix",
        hypothesisId: "H-payload",
        location: "admin/biometric-enroll/route.ts:POST:payload",
        message: "enroll payload ready",
        data: { userId, modalities: Object.keys(images) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const { res, data, text } = await postBiometricEnrollJson(payload);

    // #region agent log
    fetch("http://127.0.0.1:7440/ingest/e2a01d83-0a9f-476b-8c9e-61fa3d3a3a79", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e23d66" },
      body: JSON.stringify({
        sessionId: "e23d66",
        runId: "enroll-fix",
        hypothesisId: "H-upstream",
        location: "admin/biometric-enroll/route.ts:POST:upstream",
        message: "python enroll response",
        data: {
          ok: res.ok,
          status: res.status,
          success: data?.success ?? false,
          textPreview: text.slice(0, 80),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    let embeddings: Record<string, number[]> = {};
    let enrollMessage = data?.message ?? "";

    if (res.ok && data?.success && data.embeddings && Object.keys(data.embeddings).length > 0) {
      embeddings = data.embeddings;
    } else {
      const local = await enrollUserLocally(userId, {
        face_image: images.face_image ?? null,
        iris_image: images.iris_image ?? null,
        fingerprint_image: images.fingerprint_image ?? null,
      });
      if (!local.success) {
        return NextResponse.json(
          {
            error: local.message,
            upstream: { status: res.status, body: data ?? text },
          },
          { status: 502 }
        );
      }
      embeddings = local.embeddings;
      enrollMessage = local.message;
    }

    await persistBiometricEnrollment({
      userId,
      embeddings,
      request,
      auditAction: "admin_biometric_enrollment",
    });

    // #region agent log
    fetch("http://127.0.0.1:7440/ingest/e2a01d83-0a9f-476b-8c9e-61fa3d3a3a79", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e23d66" },
      body: JSON.stringify({
        sessionId: "e23d66",
        runId: "enroll-fix",
        hypothesisId: "H-persist",
        location: "admin/biometric-enroll/route.ts:POST:done",
        message: "enroll persisted",
        data: { userId, modalities: Object.keys(embeddings) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({
      success: true,
      message: enrollMessage,
      modalities: Object.keys(embeddings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isConfig = /BIOMETRIC_ENROLL|BIOMETRIC_API_URL/i.test(message);
    return NextResponse.json({ error: message }, { status: isConfig ? 503 : 500 });
  }
}
