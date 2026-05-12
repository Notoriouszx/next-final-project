import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";
import { roomsForPatientBroadcast } from "@/lib/patient-realtime";

const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

const metaSchema = z.object({
  description: z.string().max(500).optional(),
});

async function persistFile(
  patientId: string,
  file: File
): Promise<{ fileUrl: string; fileType: string; fileSize: number }> {
  const fileType = file.type || "application/octet-stream";
  const fileSize = file.size;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(
      `records/${patientId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      file,
      { access: "public", addRandomSuffix: true }
    );
    return { fileUrl: blob.url, fileType, fileSize };
  }

  if (process.env.NODE_ENV === "development") {
    const dir = path.join(process.cwd(), "public", "uploads", patientId);
    await mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fp = path.join(dir, safeName);
    await writeFile(fp, buffer);
    return {
      fileUrl: `/uploads/${patientId}/${safeName}`,
      fileType,
      fileSize,
    };
  }

  throw new Error("BLOB_READ_WRITE_TOKEN is required for file uploads in production");
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const description = metaSchema.safeParse({
      description: formData.get("description") ?? undefined,
    }).data?.description;

    const files = formData.getAll("files").filter((v): v is File => v instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const created: { id: string; fileUrl: string; fileName: string | null }[] = [];

    for (const file of files) {
      if (!ALLOWED.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported type: ${file.type}. Use PDF, JPG, or PNG.` },
          { status: 400 }
        );
      }
      const max = 15 * 1024 * 1024;
      if (file.size > max) {
        return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
      }

      const { fileUrl, fileType, fileSize } = await persistFile(session.user.id, file);

      const record = await prisma.medicalRecord.create({
        data: {
          patientId: session.user.id,
          fileUrl,
          fileName: file.name,
          fileType,
          fileSize,
          description: description ?? null,
        },
      });

      await writeAuditLog({
        userId: session.user.id,
        action: "medical_record_uploaded",
        category: "CREATE",
        details: { recordId: record.id, fileName: file.name, fileType },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });

      created.push({
        id: record.id,
        fileUrl: record.fileUrl,
        fileName: record.fileName,
      });
    }

    const rooms = await roomsForPatientBroadcast(session.user.id);
    await emitRealtime("record:uploaded", rooms, {
      patientId: session.user.id,
      count: created.length,
      recordIds: created.map((c) => c.id),
    });

    return NextResponse.json({ items: created });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
