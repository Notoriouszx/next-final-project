import type { UserRole } from "@/lib/types";

export function assertDoctorRole(role: string | undefined): role is "doctor" {
  return role === "doctor";
}

export function canDoctorManageGrant(
  role: UserRole | string | undefined,
  doctorId: string | null | undefined,
  sessionUserId: string
): boolean {
  return role === "doctor" && doctorId === sessionUserId;
}
