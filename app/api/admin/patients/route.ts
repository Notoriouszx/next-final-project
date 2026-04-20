import { NextRequest, NextResponse } from "next/server";
import { getPatientProfiles } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  const patients = await getPatientProfiles();
  return NextResponse.json({ items: patients });
}
