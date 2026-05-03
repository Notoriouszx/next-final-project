import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMagicToken, generateOtpCode } from "@/lib/tokens";
import { writeAuditLog } from "@/lib/audit";
import { emitRealtime } from "@/lib/realtime";
import { roomsForPatientBroadcast } from "@/lib/patient-realtime";

const createSchema = z.object({
  doctorId: z.string().optional(),
  nurseId: z.string().optional(),
  expiresInHours: z.number().min(1).max(720).default(72),
});

/**
 * Patient creates a grant for a doctor or nurse (magic link token + OTP).
 * Caller must be authenticated as the patient.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { doctorId, nurseId, expiresInHours } = createSchema.parse(body);

    if (!doctorId && !nurseId) {
      return NextResponse.json(
        { error: "Provide doctorId or nurseId" },
        { status: 400 }
      );
    }
    if (doctorId && nurseId) {
      return NextResponse.json(
        { error: "Specify only one of doctorId or nurseId" },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const grant = await prisma.accessGrant.create({
      data: {
        patientId: session.user.id,
        doctorId: doctorId ?? null,
        nurseId: nurseId ?? null,
        token: generateMagicToken(),
        otp: generateOtpCode(),
        expiresAt,
        status: "pending",
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "access_grant_created",
      category: "SECURITY",
      details: { grantId: grant.id, doctorId, nurseId },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    const rooms = await roomsForPatientBroadcast(session.user.id);
    const staffRoom = doctorId ? `user:${doctorId}` : nurseId ? `user:${nurseId}` : null;
    const allRooms = staffRoom ? [...new Set([...rooms, staffRoom])] : rooms;
    await emitRealtime("access:updated", allRooms, {
      kind: "granted",
      patientId: session.user.id,
      grantId: grant.id,
    });

    return NextResponse.json({
      id: grant.id,
      token: grant.token,
      otp: grant.otp,
      expiresAt: grant.expiresAt.toISOString(),
      magicLinkPath: `/auth/verify-grant?token=${grant.token}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
