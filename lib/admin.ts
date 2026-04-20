import { z } from "zod";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export const RoleSchema = z.enum(["admin", "doctor", "nurse", "patient"]);
const StatusSchema = z.enum(["active", "inactive", "all"]).default("all");

export const UserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().default(""),
  role: z.union([RoleSchema, z.literal("all")]).default("all"),
  status: StatusSchema,
});

export const UpdateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  role: RoleSchema,
  isActive: z.boolean(),
});

export const DeleteUserSchema = z.object({
  id: z.string().min(1),
});

export const CreateStaffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  username: z.string().trim().min(3).max(40),
});

type Actor = { id: string; email?: string | null };

function userWhereFromQuery(query: z.infer<typeof UserQuerySchema>) {
  return {
    role: query.role === "all" ? undefined : query.role,
    isActive: query.status === "all" ? undefined : query.status === "active",
    OR: query.search
      ? [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { email: { contains: query.search, mode: "insensitive" as const } },
        ]
      : undefined,
  };
}

export async function getUsers(rawQuery: unknown) {
  const query = UserQuerySchema.parse(rawQuery);
  const skip = (query.page - 1) * query.pageSize;
  const where = userWhereFromQuery(query);

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function updateUser(rawInput: unknown, actor: Actor) {
  const input = UpdateUserSchema.parse(rawInput);

  const updated = await prisma.user.update({
    where: { id: input.id },
    data: {
      name: input.name,
      role: input.role,
      isActive: input.isActive,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  await writeAuditLog({
    userId: actor.id,
    action: "admin_user_updated",
    details: { targetUserId: input.id, role: input.role, isActive: input.isActive },
  });

  return updated;
}

export async function deleteUser(rawInput: unknown, actor: Actor) {
  const input = DeleteUserSchema.parse(rawInput);

  const updated = await prisma.user.update({
    where: { id: input.id },
    data: { isActive: false },
    select: { id: true, isActive: true },
  });

  await writeAuditLog({
    userId: actor.id,
    action: "admin_user_soft_deleted",
    details: { targetUserId: input.id },
  });

  return updated;
}

export async function createStaff(
  rawInput: unknown,
  role: "doctor" | "nurse",
  actor: Actor
) {
  const input = CreateStaffSchema.parse(rawInput);

  const created = await prisma.user.create({
    data: {
      id: randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      role,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  await writeAuditLog({
    userId: actor.id,
    action: role === "doctor" ? "admin_doctor_added" : "admin_nurse_added",
    details: {
      targetUserId: created.id,
      username: input.username,
      onboardingEmail: role === "doctor" ? "mock_sent" : "not_required",
    },
  });

  return created;
}

export async function getDoctorProfiles() {
  const [doctors, grants, logs] = await Promise.all([
    prisma.user.findMany({
      where: { role: "doctor" },
      select: { id: true, name: true, email: true, isActive: true, biometricAuth: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.accessGrant.findMany({
      where: { doctorId: { not: null } },
      select: { doctorId: true, patientId: true, usedAt: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { userId: { not: null } },
      select: { userId: true, action: true, timestamp: true },
      orderBy: { timestamp: "desc" },
      take: 200,
    }),
  ]);

  return doctors.map((d) => {
    const doctorGrants = grants.filter((g) => g.doctorId === d.id);
    const doctorLogs = logs.filter((l) => l.userId === d.id);

    return {
      id: d.id,
      name: d.name,
      email: d.email,
      isActive: d.isActive,
      verified: Boolean(
        d.biometricAuth?.faceVerified &&
          d.biometricAuth?.irisVerified &&
          d.biometricAuth?.fingerprintVerified
      ),
      patientsCount: new Set(doctorGrants.map((g) => g.patientId)).size,
      lastActivity: doctorLogs[0]?.timestamp ?? null,
    };
  });
}

export async function getNurseProfiles() {
  const [nurses, grants, logs] = await Promise.all([
    prisma.user.findMany({
      where: { role: "nurse" },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.accessGrant.findMany({
      where: { nurseId: { not: null } },
      select: { nurseId: true, doctorId: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { userId: { not: null } },
      select: { userId: true, timestamp: true },
      orderBy: { timestamp: "desc" },
      take: 200,
    }),
  ]);

  return nurses.map((n) => {
    const nurseGrants = grants.filter((g) => g.nurseId === n.id);
    const nurseLogs = logs.filter((l) => l.userId === n.id);

    return {
      id: n.id,
      name: n.name,
      email: n.email,
      isActive: n.isActive,
      assignedDoctors: Array.from(
        new Set(nurseGrants.map((g) => g.doctorId).filter(Boolean))
      ).length,
      lastActivity: nurseLogs[0]?.timestamp ?? null,
    };
  });
}

export async function getPatientProfiles() {
  const [patients, records, grants, bio] = await Promise.all([
    prisma.user.findMany({
      where: { role: "patient" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.medicalRecord.findMany({
      select: { patientId: true, createdAt: true, fileName: true, id: true },
    }),
    prisma.accessGrant.findMany({
      select: { patientId: true, doctorId: true, nurseId: true },
    }),
    prisma.biometricAuth.findMany({
      select: {
        userId: true,
        faceVerified: true,
        irisVerified: true,
        fingerprintVerified: true,
      },
    }),
  ]);

  return patients.map((p) => {
    const patientRecords = records.filter((r) => r.patientId === p.id);
    const patientGrants = grants.filter((g) => g.patientId === p.id);
    const biometric = bio.find((b) => b.userId === p.id);
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      isActive: p.isActive,
      recordsCount: patientRecords.length,
      lastUpload: patientRecords.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )[0]?.createdAt,
      accessGrantedCount: patientGrants.length,
      twoFactorEnabled: p.twoFactorEnabled,
      biometricsEnabled: Boolean(
        biometric?.faceVerified || biometric?.irisVerified || biometric?.fingerprintVerified
      ),
    };
  });
}
