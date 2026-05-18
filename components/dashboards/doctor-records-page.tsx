import { User } from "@/lib/types";
import prisma from "@/lib/prisma";
import { DoctorRecordsClient } from "@/components/doctor/doctor-records-client";

export default async function DoctorRecordsPage({ user }: { user: User }) {
  const now = new Date();
  const grants = await prisma.accessGrant.findMany({
    where: {
      doctorId: user.id,
      status: { in: ["active", "resolved"] },
    },
    select: { patientId: true },
  });
  const patientIds = [...new Set(grants.map((g) => g.patientId))];
  const records =
    patientIds.length === 0
      ? []
      : await prisma.medicalRecord.findMany({
          where: { patientId: { in: patientIds } },
          orderBy: { createdAt: "desc" },
          take: 120,
          include: { patient: { select: { name: true } } },
        });

  const rows = records.map((r) => ({
    id: r.id,
    patientName: r.patient.name,
    fileName: r.fileName,
    fileType: r.fileType,
    fileUrl: r.fileUrl,
    createdAt: r.createdAt.toISOString(),
  }));

  return <DoctorRecordsClient records={rows} />;
}
