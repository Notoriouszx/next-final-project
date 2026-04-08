import prisma from "@/lib/prisma";

type AuditLogCreateData = Parameters<typeof prisma.auditLog.create>[0]["data"];
type AuditLogDetails = AuditLogCreateData["details"];

export async function writeAuditLog(input: {
  userId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? undefined,
      action: input.action,
      details: input.details as AuditLogDetails,
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });
}
