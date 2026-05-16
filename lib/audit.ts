import prisma from "@/lib/prisma";

export type AuditCategory = "CREATE" | "DELETE" | "UPDATE" | "SECURITY";

type AuditLogCreateData = Parameters<typeof prisma.auditLog.create>[0]["data"];
type AuditLogDetails = AuditLogCreateData["details"];

export function inferCategoryFromAction(action: string): AuditCategory {
  const a = action.toLowerCase();
  if (
    a.includes("revoked") ||
    a.includes("deleted") ||
    a.includes("soft_deleted") ||
    a.includes("remove")
  ) {
    return "DELETE";
  }
  if (a.includes("grant") || a.includes("access") || a.includes("magic") || a.includes("otp")) {
    return "SECURITY";
  }
  if (a.includes("biometric") || a.includes("two_factor") || a.includes("2fa")) {
    return "SECURITY";
  }
  if (
    a.includes("upload") ||
    a.includes("_added") ||
    a.includes("created") ||
    a.includes("registration")
  ) {
    return "CREATE";
  }
  if (a.includes("updated") || a.includes("edit")) {
    return "UPDATE";
  }
  return "UPDATE";
}

export async function writeAuditLog(input: {
  userId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: string;
  category?: AuditCategory | null;
}) {
  const category = input.category ?? inferCategoryFromAction(input.action);
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? undefined,
      action: input.action,
      details: input.details as AuditLogDetails,
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
      status: input.status ?? "success",
      category,
    },
  });
}
