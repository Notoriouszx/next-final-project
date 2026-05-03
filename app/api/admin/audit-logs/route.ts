import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { inferCategoryFromAction } from "@/lib/audit";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().default(""),
  action: z.string().default(""),
  role: z.enum(["all", "admin", "doctor", "nurse", "patient"]).default("all"),
  category: z.enum(["all", "CREATE", "DELETE", "UPDATE", "SECURITY"]).default("all"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const q = querySchema.parse(raw);

  const fromDate = q.from ? new Date(q.from) : undefined;
  const toDate = q.to ? new Date(q.to) : undefined;
  if (fromDate && Number.isNaN(fromDate.getTime())) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }
  if (toDate && Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
  }

  const where: Prisma.AuditLogWhereInput = {
    AND: [
      q.search.trim()
        ? {
            OR: [
              { action: { contains: q.search.trim(), mode: "insensitive" } },
              { user: { name: { contains: q.search.trim(), mode: "insensitive" } } },
              { user: { email: { contains: q.search.trim(), mode: "insensitive" } } },
            ],
          }
        : {},
      q.action.trim()
        ? { action: { contains: q.action.trim(), mode: "insensitive" } }
        : {},
      q.category !== "all" ? { category: q.category } : {},
      q.role !== "all" ? { user: { role: q.role } } : {},
      fromDate || toDate
        ? {
            timestamp: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {},
    ],
  };

  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: q.pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    action: r.action,
    status: r.status,
    category: r.category ?? inferCategoryFromAction(r.action),
    timestamp: r.timestamp.toISOString(),
    ipAddress: r.ipAddress ?? "—",
    user: r.user
      ? { id: r.user.id, name: r.user.name, email: r.user.email, role: r.user.role }
      : null,
  }));

  return NextResponse.json({
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
}
