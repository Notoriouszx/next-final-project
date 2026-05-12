import prisma from "@/lib/prisma";

/** Rooms that should receive patient-centric events (dashboards + assigned staff). */
export async function roomsForPatientBroadcast(patientId: string) {
  const grants = await prisma.accessGrant.findMany({
    where: {
      patientId,
      status: { in: ["active", "pending"] },
      expiresAt: { gt: new Date() },
    },
    select: { doctorId: true, nurseId: true },
  });
  const rooms = new Set<string>(["admin", `patient:${patientId}`]);
  for (const g of grants) {
    if (g.doctorId) rooms.add(`user:${g.doctorId}`);
    if (g.nurseId) rooms.add(`user:${g.nurseId}`);
  }
  return [...rooms];
}
