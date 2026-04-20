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

  const [nurse, grants, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.accessGrant.findMany({
      where: { nurseId: id },
      include: {
        doctor: { select: { id: true, name: true, email: true } },
        patient: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { timestamp: "desc" },
      take: 20,
    }),
  ]);

  if (!nurse || nurse.role !== "nurse") {
    return NextResponse.json({ error: "Nurse not found" }, { status: 404 });
  }

  return NextResponse.json({
    nurse,
    assignedDoctors: grants
      .filter((g) => g.doctor)
      .map((g) => ({
        id: g.doctor!.id,
        name: g.doctor!.name,
        email: g.doctor!.email,
      })),
    activity: logs,
    assignedPatients: grants.map((g) => g.patient),
  });
}
