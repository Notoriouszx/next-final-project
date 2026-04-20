import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateMagicToken, generateOtpCode } from "@/lib/tokens";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  const { id } = await params;

  const [patient, records, grants, bio] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
    }),
    prisma.medicalRecord.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.accessGrant.findMany({
      where: { patientId: id },
      include: {
        doctor: { select: { id: true, name: true, email: true } },
        nurse: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.biometricAuth.findUnique({ where: { userId: id } }),
  ]);

  if (!patient || patient.role !== "patient") {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({
    patient,
    records,
    access: grants,
    security: {
      twoFactorEnabled: patient.twoFactorEnabled,
      biometricsEnabled: Boolean(
        bio?.faceVerified || bio?.irisVerified || bio?.fingerprintVerified
      ),
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  const { id } = await params;
  const body = (await request.json()) as { action?: string; grantId?: string };

  if (body.action === "revoke" && body.grantId) {
    await prisma.accessGrant.update({
      where: { id: body.grantId },
      data: { status: "revoked" },
    });
    await writeAuditLog({
      userId: authState.session.user.id,
      action: "admin_patient_access_revoked",
      details: { patientId: id, grantId: body.grantId },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "generate-otp") {
    const otp = generateOtpCode();
    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const grant = await prisma.accessGrant.create({
      data: {
        patientId: id,
        token,
        otp,
        expiresAt,
        status: "pending",
      },
    });
    await writeAuditLog({
      userId: authState.session.user.id,
      action: "admin_patient_magic_link_generated",
      details: { patientId: id, grantId: grant.id },
    });
    return NextResponse.json({
      otp,
      magicLinkPath: `/auth/verify-grant?token=${token}`,
      expiresAt,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
