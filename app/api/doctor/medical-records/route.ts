import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";
import { roomsForPatientBroadcast } from "@/lib/patient-realtime";
import { doctorRecordUploadSchema } from "@/lib/doctor-schemas";
import { assertDoctorRole } from "@/lib/doctor-rbac";
import {
  MEDICAL_RECORD_ALLOWED_TYPES,
  persistMedicalRecordFile,
} from "@/lib/medical-record-storage";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (!assertDoctorRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const patientId = String(formData.get("patientId") ?? "");
    const descriptionRaw = formData.get("description");
    const meta = doctorRecordUploadSchema.safeParse({
      patientId,
      description:
        typeof descriptionRaw === "string" && descriptionRaw.trim()
          ? descriptionRaw.trim()
          : undefined,
    });

    if (!meta.success) {
      return NextResponse.json({ error: meta.error.issues }, { status: 400 });
    }

    const now = new Date();
    const activeGrant = await prisma.accessGrant.findFirst({
      where: {
        patientId: meta.data.patientId,
        doctorId: session.user.id,
        status: "active",
        expiresAt: { gt: now },
      },
    });

    if (!activeGrant) {
      return NextResponse.json(
        { error: "No active access for this patient" },
        { status: 403 }
      );
    }

    const files = formData.getAll("files").filter((v): v is File => v instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const created: { id: string; fileUrl: string; fileName: string | null }[] = [];

    for (const file of files) {
      if (!MEDICAL_RECORD_ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported type: ${file.type}. Use PDF, JPG, or PNG.` },
          { status: 400 }
        );
      }
      const max = 15 * 1024 * 1024;
      if (file.size > max) {
        return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
      }

      const { fileUrl, fileType, fileSize } = await persistMedicalRecordFile(
        meta.data.patientId,
        file
      );

      const record = await prisma.medicalRecord.create({
        data: {
          patientId: meta.data.patientId,
          fileUrl,
          fileName: file.name,
          fileType,
          fileSize,
          description: meta.data.description ?? `Added by Dr. ${session.user.name}`,
        },
      });

      created.push({
        id: record.id,
        fileUrl: record.fileUrl,
        fileName: record.fileName,
      });
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "doctor_medical_record_uploaded",
      category: "CREATE",
      details: {
        patientId: meta.data.patientId,
        grantId: activeGrant.id,
        count: created.length,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    const rooms = await roomsForPatientBroadcast(meta.data.patientId);
    await emitRealtime("record:uploaded", [...rooms, `user:${session.user.id}`], {
      patientId: meta.data.patientId,
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
