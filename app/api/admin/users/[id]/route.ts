import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { deleteUser } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  try {
    const { id } = await params;
    const result = await deleteUser(
      { id },
      { id: authState.session.user.id, email: authState.session.user.email }
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
