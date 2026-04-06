import type { UserRole } from "@/lib/types";

const roleOrder: Record<UserRole, number> = {
  patient: 1,
  nurse: 2,
  doctor: 3,
  admin: 4,
};

export function hasMinimumRole(userRole: UserRole, minimum: UserRole): boolean {
  return roleOrder[userRole] >= roleOrder[minimum];
}

export function canAccessDashboard(
  userRole: UserRole,
  dashboard: "admin" | "doctor" | "nurse" | "patient"
): boolean {
  return userRole === dashboard;
}
