import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return { error: "Forbidden", status: 403 as const };
  }

  return { session };
}
