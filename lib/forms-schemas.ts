import { z } from "zod";
import { UserRoleSchema } from "@/lib/rbac";

export const loginPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginOtpSchema = z.object({
  email: z.string().email("Enter a valid email"),
  otp: z.string().min(4, "Enter the code from your email").max(8),
});

export const profilePatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
});

export { UserRoleSchema };
