import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function getSession(): Promise<User | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }

  const u = session.user as {
    id: string;
    email: string;
    name: string;
    role?: string;
    phone?: string | null;
    twoFactorEnabled?: boolean | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    isActive?: boolean | null;
  };

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: (u.role ?? "patient") as User["role"],
    phone: u.phone ?? undefined,
    two_factor_enabled: Boolean(u.twoFactorEnabled),
    email_verified: u.emailVerified,
    is_active: u.isActive !== false,
    created_at: u.createdAt.toISOString(),
    updated_at: u.updatedAt.toISOString(),
  };
}
