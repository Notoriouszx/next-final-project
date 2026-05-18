import { User } from "@/lib/types";
import prisma from "@/lib/prisma";
import { DoctorPatientsClient } from "@/components/doctor/doctor-patients-client";

export default async function DoctorMyPatientsPage({ user }: { user: User }) {
  const now = new Date();
  const grants = await prisma.accessGrant.findMany({
    where: { doctorId: user.id, status: "active", expiresAt: { gt: now } },
    include: { patient: true },
    orderBy: { createdAt: "desc" },
  });

  const patients = grants.map((g) => ({
    grantId: g.id,
    patientId: g.patientId,
    name: g.patient.name,
    email: g.patient.email,
    grantedAt: g.createdAt.toISOString(),
    expiresAt: g.expiresAt.toISOString(),
  }));

  return <DoctorPatientsClient patients={patients} />;
}
