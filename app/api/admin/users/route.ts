import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUsers, updateUser } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { emitRealtime } from "@/lib/realtime";

export async function GET(request: NextRequest) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  try {
    const params = request.nextUrl.searchParams;
    const result = await getUsers({
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
      search: params.get("search") ?? undefined,
      role: params.get("role") ?? undefined,
      status: params.get("status") ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  try {
    const body = await request.json();
    const updated = await updateUser(body, {
      id: authState.session.user.id,
      email: authState.session.user.email,
    });
    await emitRealtime("admin:users_updated", ["admin"], {
      kind: "user_updated",
      targetUserId: updated.id,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
