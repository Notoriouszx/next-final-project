import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ user: null });
  }
  const role = (session.user as { role?: string }).role ?? "patient";
  return NextResponse.json({
    user: { id: session.user.id, role },
  });
}
