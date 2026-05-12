import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

const querySchema = z.object({
  search: z.string().optional().default(""),
  role: z.enum(["all", "doctor", "nurse"]).default("all"),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patientId = session.user.id;
  const q = querySchema.parse({
    search: request.nextUrl.searchParams.get("search") ?? "",
    role: request.nextUrl.searchParams.get("role") ?? "all",
  });

  const busy = await prisma.accessGrant.findMany({
    where: {
      patientId,
      status: { in: ["active", "pending"] },
      expiresAt: { gt: new Date() },
    },
    select: { doctorId: true, nurseId: true },
  });
  const busyDoctor = new Set(busy.map((b) => b.doctorId).filter(Boolean) as string[]);
  const busyNurse = new Set(busy.map((b) => b.nurseId).filter(Boolean) as string[]);

  const filters: Prisma.UserWhereInput[] = [
    {
      role: q.role === "all" ? { in: ["doctor", "nurse"] } : q.role,
      isActive: true,
    },
  ];
  if (q.search.trim()) {
    filters.push({
      name: { contains: q.search.trim(), mode: "insensitive" },
    });
  }

  const users = await prisma.user.findMany({
    where: { AND: filters },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      biometricAuth: {
        select: {
          faceVerified: true,
          irisVerified: true,
          fingerprintVerified: true,
          verifiedAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
    take: 80,
  });

  const logs = await prisma.auditLog.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    orderBy: { timestamp: "desc" },
    take: 400,
    select: { userId: true, timestamp: true },
  });
  const lastByUser = new Map<string, Date>();
  for (const l of logs) {
    if (l.userId && !lastByUser.has(l.userId)) {
      lastByUser.set(l.userId, l.timestamp);
    }
  }

  const items = users
    .filter((u) => {
      if (u.role === "doctor") return !busyDoctor.has(u.id);
      if (u.role === "nurse") return !busyNurse.has(u.id);
      return false;
    })
    .map((u) => {
      const bio = u.biometricAuth;
      const verified = Boolean(
        bio?.faceVerified && bio?.irisVerified && bio?.fingerprintVerified
      );
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        verified,
        lastActivity: lastByUser.get(u.id)?.toISOString() ?? null,
      };
    });

  return NextResponse.json({ items });
}
