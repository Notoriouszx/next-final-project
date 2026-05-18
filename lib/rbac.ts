import { z } from "zod";
import type { UserRole } from "@/lib/types";

export const UserRoleSchema = z.enum(["patient", "nurse", "doctor", "admin"]);

const roleOrder: Record<UserRole, number> = {
  patient: 1,
  nurse: 2,
  doctor: 3,
  admin: 4,
};

/** Routes each role may access (dashboard path segment, empty string = home). */
export const ROLE_ROUTE_SEGMENTS: Record<UserRole, readonly string[]> = {
  admin: [
    "",
    "users",
    "doctors",
    "nurses",
    "patients",
    "records",
    "analytics",
    "audit-logs",
    "settings",
  ],
  doctor: ["", "my-patients", "access-requests", "records", "profile"],
  nurse: ["", "assigned-patients", "records", "profile"],
  patient: ["", "my-records", "upload", "grant-access", "security"],
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

export function canAccessRoute(role: UserRole, pathSegment: string): boolean {
  const allowed = ROLE_ROUTE_SEGMENTS[role];
  return allowed.includes(pathSegment);
}

export function assertRouteAccess(role: UserRole, pathSegment: string): boolean {
  return canAccessRoute(role, pathSegment);
}

export const DashboardPathSchema = z.object({
  segment: z.string().default(""),
});
