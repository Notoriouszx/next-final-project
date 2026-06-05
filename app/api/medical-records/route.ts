import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyTokenAndGetUser } from "@/lib/verify-token";
import { writeAuditLog } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";
import { roomsForPatientBroadcast } from "@/lib/patient-realtime";
import {
  MEDICAL_RECORD_ALLOWED_TYPES,
  persistMedicalRecordFile,
} from "@/lib/medical-record-storage";

const metaSchema = z.object({
  description: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const user = await verifyTokenAndGetUser(authHeader);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "patient")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const records = await prisma.medicalRecord.findMany({
      where: { patientId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        description: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ items: records });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const user = await verifyTokenAndGetUser(authHeader);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "patient")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await request.formData();
    const description = metaSchema.safeParse({
      description: formData.get("description") ?? undefined,
    }).data?.description;
    const files = formData
      .getAll("files")
      .filter((v): v is File => v instanceof File);
    if (files.length === 0)
      return NextResponse.json({ error: "No files provided" }, { status: 400 });

    const created = [];
    for (const file of files) {
      if (!MEDICAL_RECORD_ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported type: ${file.type}. Use PDF, JPG, or PNG.` },
          { status: 400 },
        );
      }
      if (file.size > 15 * 1024 * 1024)
        return NextResponse.json(
          { error: "File too large (max 15MB)" },
          { status: 400 },
        );
      const { fileUrl, fileType, fileSize } = await persistMedicalRecordFile(
        user.id,
        file,
      );
      const record = await prisma.medicalRecord.create({
        data: {
          patientId: user.id,
          fileUrl,
          fileName: file.name,
          fileType,
          fileSize,
          description: description ?? null,
        },
      });
      await writeAuditLog({
        userId: user.id,
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
    const rooms = await roomsForPatientBroadcast(user.id);
    await emitRealtime("record:uploaded", rooms, {
      patientId: user.id,
      count: created.length,
      recordIds: created.map((c) => c.id),
    });
    return NextResponse.json({ items: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
