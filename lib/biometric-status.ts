export type BiometricDisplayStatus = "pending" | "enrolled" | "verified";

export function resolveBiometricStatus(input: {
  enrolled: boolean;
  verified: boolean;
}): BiometricDisplayStatus {
  if (input.verified) return "verified";
  if (input.enrolled) return "enrolled";
  return "pending";
}

export function biometricStatusBadge(status: BiometricDisplayStatus) {
  switch (status) {
    case "verified":
      return { label: "verified", variant: "success" as const };
    case "enrolled":
      return { label: "enrolled", variant: "enrolled" as const };
    default:
      return { label: "pending", variant: "warning" as const };
  }
}
