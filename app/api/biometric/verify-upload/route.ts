import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const formSchema = z.object({
  userId: z.string().min(1),
  biometricType: z.enum(["face", "iris", "fingerprint"]),
});

function getApiBase() {
  const url = process.env.BIOMETRIC_API_URL;
  if (!url) {
    throw new Error("BIOMETRIC_API_URL is not set");
  }
  return url.replace(/\/+$/, "");
}

async function postToBiometricService(form: FormData) {
  const base = getApiBase();
  const candidates = [`${base}/verify`, `${base}/biometric/verify`, `${base}/api/verify`];

  let lastErr: unknown;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "POST", body: form });
      if (res.ok) {
        return { url, res };
      }
      // If endpoint doesn't exist try next; otherwise bubble response.
      if (res.status !== 404) {
        return { url, res };
      }
      lastErr = new Error(`404 from ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Failed to reach biometric service");
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
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

    const out = new FormData();
    out.set("userId", parsed.data.userId);
    out.set("biometricType", parsed.data.biometricType);
    for (const file of files) {
      out.append("files", file, file.name);
    }

    const { url, res } = await postToBiometricService(out);
    const text = await res.text();
    const responseTime = Date.now() - startedAt;

    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    const verified =
      typeof json?.verified === "boolean"
        ? (json.verified as boolean)
        : typeof json?.success === "boolean"
          ? (json.success as boolean)
          : res.ok;

    const confidence = typeof json?.confidence === "number" ? (json.confidence as number) : null;
    const quality = typeof json?.quality === "number" ? (json.quality as number) : null;
    const embedding = json?.embedding ?? json?.template ?? null;

    const ipAddress = request.headers.get("x-forwarded-for");
    const userAgent = request.headers.get("user-agent");

    await prisma.biometricAttempt.create({
      data: {
        userId: parsed.data.userId,
        success: verified,
        confidence: confidence ?? undefined,
        modalityUsed: parsed.data.biometricType,
        responseTime,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
        errorMessage: res.ok ? undefined : `biometric-service:${res.status}`,
      },
    });

    // Update main biometric_auth record
    const verifyPayload: Record<string, unknown> = {
      userId: parsed.data.userId,
      biometricType: parsed.data.biometricType,
      verified,
      ...(quality !== null ? { quality } : {}),
      ...(embedding !== null ? { embedding } : {}),
    };

    await fetch(new URL("/api/biometric/verify", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verifyPayload),
    });

    // Store/refresh one active sample for the modality (optional but useful)
    if (embedding !== null) {
      await prisma.biometricSample.upsert({
        where: {
          userId_modality_isActive: {
            userId: parsed.data.userId,
            modality: parsed.data.biometricType,
            isActive: true,
          },
        },
        create: {
          userId: parsed.data.userId,
          modality: parsed.data.biometricType,
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

    await writeAuditLog({
      userId: parsed.data.userId,
      action: `biometric_verify_upload_${parsed.data.biometricType}`,
      category: "SECURITY",
      details: { verified, files: files.length, upstream: url, upstreamStatus: res.status },
      ipAddress,
      userAgent,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Biometric service error", upstream: { url, status: res.status, body: json ?? text } },
        { status: 502 }
      );
    }

    return NextResponse.json({
      verified,
      confidence,
      quality,
      upstream: { url },
      raw: json ?? text,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

