import type { UserRole } from "@/lib/types";

export const ROLE_BADGE_VARIANT = {
  admin: "roleAdmin",
  doctor: "roleDoctor",
  nurse: "roleNurse",
  patient: "rolePatient",
} as const satisfies Record<UserRole, string>;

export function roleBadgeVariant(role: string): (typeof ROLE_BADGE_VARIANT)[UserRole] | "secondary" {
  if (role in ROLE_BADGE_VARIANT) {
    return ROLE_BADGE_VARIANT[role as UserRole];
  }
  return "secondary";
}
