import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildPayloadForModality,
  fileToDataUrl,
  runExternalJsonVerify,
} from "@/lib/biometric-verify-service";

const formSchema = z.object({
  userId: z.string().min(1),
  biometricType: z.enum(["face", "iris", "fingerprint"]),
});

export async function POST(request: NextRequest) {
  try {
    const fd = await request.formData();
    const userId = String(fd.get("userId") ?? "");
    const biometricType = String(fd.get("biometricType") ?? "");

    const parsed = formSchema.safeParse({ userId, biometricType });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const files = fd.getAll("files").filter((v): v is File => v instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // One data URL per request for this modality (first file chosen; extra files ignored).
    const dataUrl = await fileToDataUrl(files[0]);
    const payload = buildPayloadForModality(parsed.data.userId, parsed.data.biometricType, dataUrl);

    const { res, verified, confidence, quality, embedding, raw, upstreamUrl } =
      await runExternalJsonVerify(payload, request, {
        modality: parsed.data.biometricType,
        auditAction: `biometric_verify_upload_${parsed.data.biometricType}`,
        filesCount: files.length,
      });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Biometric service error",
          upstream: { url: upstreamUrl, status: res.status, body: raw },
          hint:
            "Set BIOMETRIC_VERIFY_URL in Vercel to the exact REST endpoint that accepts JSON { user_id, face_image, iris_image, fingerprint_image } (base64 data URLs). " +
            "Your Render app returns 404 for /api/verify; it may use a different path or only GraphQL.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      verified,
      confidence,
      quality,
      upstream: { url: upstreamUrl },
      raw,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isConfig = /BIOMETRIC_VERIFY|BIOMETRIC_API_URL/i.test(message);
    console.error(error);
    return NextResponse.json({ error: message }, { status: isConfig ? 503 : 500 });
  }
}
