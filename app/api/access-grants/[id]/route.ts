import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { writeAuditLog } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";
import { roomsForPatientBroadcast } from "@/lib/patient-realtime";
import { resolveAccessGrantSchema } from "@/lib/doctor-schemas";
import { canDoctorManageGrant } from "@/lib/doctor-rbac";

const completeCareSchema = z.object({
  action: z.literal("complete_care"),
});

function extractTokenFromMagicInput(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed, "http://localhost");
    const fromQuery = url.searchParams.get("token");
    if (fromQuery) return fromQuery;
  } catch {
    /* plain token */
  }
  return trimmed;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const { id } = await params;

  const grant = await prisma.accessGrant.findUnique({
    where: { id },
    include: { patient: { select: { id: true, name: true } } },
  });
  if (!grant) {
    return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  }

  const body = await request.json();

  if (completeCareSchema.safeParse(body).success) {
    if (!canDoctorManageGrant(role, grant.doctorId, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (grant.status !== "active") {
      return NextResponse.json(
        { error: "Only active assignments can be completed" },
        { status: 400 },
      );
    }
    await prisma.accessGrant.update({
      where: { id },
      data: { status: "resolved" },
    });
    await writeAuditLog({
      userId: session.user.id,
      action: "access_grant_resolved_by_doctor",
      category: "SECURITY",
      details: { grantId: id, patientId: grant.patientId },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });
    const rooms = await roomsForPatientBroadcast(grant.patientId);
    const staffRoom = `user:${session.user.id}`;
    await emitRealtime("access:updated", [...new Set([...rooms, staffRoom])], {
      kind: "resolved",
      patientId: grant.patientId,
      grantId: id,
    });
    return NextResponse.json({ ok: true, status: "resolved" });
  }

  const parsed = resolveAccessGrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const isDoctor = canDoctorManageGrant(role, grant.doctorId, session.user.id);
  const isNurse = role === "nurse" && grant.nurseId === session.user.id;
  if (!isDoctor && !isNurse) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (grant.status !== "pending") {
    return NextResponse.json(
      { error: "This request is no longer pending" },
      { status: 400 },
    );
  }
  if (new Date() > grant.expiresAt) {
    return NextResponse.json(
      { error: "This access request has expired" },
      { status: 400 },
    );
  }

  const { method, otp, magicLink } = parsed.data;
  if (method === "otp") {
    const code = otp?.trim() ?? "";
    if (!grant.otp || grant.otp !== code) {
      return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });
    }
  } else {
    const token = extractTokenFromMagicInput(magicLink ?? "");
    if (!grant.token || grant.token !== token) {
      return NextResponse.json(
        { error: "Invalid magic link or token" },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.accessGrant.update({
    where: { id },
    data: { status: "active", usedAt: new Date() },
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "access_grant_activated",
    category: "SECURITY",
    details: { grantId: id, patientId: grant.patientId, method },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  const rooms = await roomsForPatientBroadcast(grant.patientId);
  const staffRoom = `user:${session.user.id}`;
  await emitRealtime("access:updated", [...new Set([...rooms, staffRoom])], {
    kind: "activated",
    patientId: grant.patientId,
    grantId: id,
  });

  return NextResponse.json({
    ok: true,
    status: updated.status,
    patientName: grant.patient.name,
    expiresAt: updated.expiresAt.toISOString(),
  });
}
