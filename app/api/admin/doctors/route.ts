import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createStaff, getDoctorProfiles } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  const doctors = await getDoctorProfiles();
  return NextResponse.json({ items: doctors });
}

export async function POST(request: NextRequest) {
  const authState = await requireAdmin(request);
  if ("error" in authState) {
    return NextResponse.json({ error: authState.error }, { status: authState.status });
  }

  try {
    const body = await request.json();
    const created = await createStaff(body, "doctor", {
      id: authState.session.user.id,
      email: authState.session.user.email,
    });
    return NextResponse.json({
      ...created,
      onboardingEmail: `Mock onboarding email sent to ${created.email}`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
