import { redirect } from "@/i18n/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { User } from "@/lib/types";
import AdminDashboard from "@/components/dashboards/admin-dashboard";
import DoctorDashboard from "@/components/dashboards/doctor-dashboard";
import NurseDashboard from "@/components/dashboards/nurse-dashboard";
import PatientDashboard from "@/components/dashboards/patient-dashboard";
import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

const TITLES: Record<string, string> = {
  users: "Users management",
  doctors: "Doctors",
  nurses: "Nurses",
  patients: "Patients",
  records: "Medical records",
  analytics: "Analytics",
  "audit-logs": "Audit logs",
  settings: "Settings",
  "my-patients": "My patients",
  "access-requests": "Access requests",
  "assigned-patients": "Assigned patients",
  "my-records": "My records",
  upload: "Upload record",
  "grant-access": "Grant access",
  security: "Security settings",
  profile: "Profile",
};

type Props = { params: Promise<{ locale: string; slug?: string[] }> };

export default async function DashboardSectionPage({ params }: Props) {
  const { locale, slug } = await params;
  const sessionUser = await getSession();

  if (sessionUser === null) {
    redirect({ href: "/auth/login", locale });
  }

  const user = sessionUser as User;
  const path = slug?.join("/") ?? "";

  if (path) {
    const title = TITLES[path] ?? path.replace(/-/g, " ");
    return <DashboardPlaceholder title={title} />;
  }

  const needsBio =
    user.role === "doctor" || user.role === "nurse" || user.role === "admin";

  if (needsBio) {
    const bio = await prisma.biometricAuth.findUnique({
      where: { userId: user.id },
    });
    const complete =
      bio?.faceVerified && bio?.irisVerified && bio?.fingerprintVerified;
    if (!complete) {
      redirect({
        href: `/auth/biometric?userId=${encodeURIComponent(user.id)}`,
        locale,
      });
    }
  }

  const dashboards = {
    admin: <AdminDashboard user={user} />,
    doctor: <DoctorDashboard user={user} />,
    nurse: <NurseDashboard user={user} />,
    patient: <PatientDashboard user={user} />,
  };

  return dashboards[user.role] ?? <div>Dashboard not found</div>;
}
