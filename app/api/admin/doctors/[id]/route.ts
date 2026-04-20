import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  const { id } = await params;

  const [doctor, grants, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.accessGrant.findMany({
      where: { doctorId: id },
      include: { patient: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { timestamp: "desc" },
      take: 20,
    }),
  ]);

  if (!doctor || doctor.role !== "doctor") {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  return NextResponse.json({
    doctor,
    assignedPatients: grants.map((g) => ({
      id: g.patient.id,
      name: g.patient.name,
      email: g.patient.email,
      grantedAt: g.createdAt,
    })),
    accessLogs: logs,
    timeline: logs.map((l) => ({ action: l.action, at: l.timestamp })),
  });
}
