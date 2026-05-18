import { User } from "@/lib/types";
import prisma from "@/lib/prisma";
import { DoctorAccessRequestsClient } from "@/components/doctor/doctor-access-requests-client";

export default async function DoctorAccessRequestsPage({ user }: { user: User }) {
  const pending = await prisma.accessGrant.findMany({
    where: { doctorId: user.id, status: "pending" },
    include: { patient: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = pending.map((p) => ({
    id: p.id,
    patientName: p.patient.name,
    patientEmail: p.patient.email,
    createdAt: p.createdAt.toISOString(),
  }));

  return <DoctorAccessRequestsClient pending={rows} />;
}
