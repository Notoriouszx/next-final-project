import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";
import { roomsForPatientBroadcast } from "@/lib/patient-realtime";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const grant = await prisma.accessGrant.findFirst({
    where: { id, patientId: session.user.id },
  });
  if (!grant) {
    return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  }

  await prisma.accessGrant.update({
    where: { id },
    data: { status: "revoked" },
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "access_grant_revoked_by_patient",
    category: "SECURITY",
    details: { grantId: id, doctorId: grant.doctorId, nurseId: grant.nurseId },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  const rooms = await roomsForPatientBroadcast(session.user.id);
  const staff = grant.doctorId
    ? `user:${grant.doctorId}`
    : grant.nurseId
      ? `user:${grant.nurseId}`
      : null;
  const allRooms = staff ? [...new Set([...rooms, staff])] : rooms;
  await emitRealtime("access:updated", allRooms, {
    kind: "revoked",
    patientId: session.user.id,
    grantId: id,
  });

  return NextResponse.json({ ok: true });
}
