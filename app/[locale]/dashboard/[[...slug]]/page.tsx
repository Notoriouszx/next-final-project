import { redirect } from "@/i18n/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { User } from "@/lib/types";
import AdminDashboard from "@/components/dashboards/admin-dashboard";
import DoctorDashboard from "@/components/dashboards/doctor-dashboard";
import NurseDashboard from "@/components/dashboards/nurse-dashboard";
import PatientDashboard from "@/components/dashboards/patient-dashboard";
import { DashboardPlaceholder } from "@/components/dashboard-placeholder";
import { AdminUsersManagement } from "@/components/dashboards/admin-users-management";
import { AdminDoctorsPanel } from "@/components/dashboards/admin-doctors-panel";
import { AdminNursesPanel } from "@/components/dashboards/admin-nurses-panel";
import { AdminPatientsPanel } from "@/components/dashboards/admin-patients-panel";
import AdminAnalyticsDashboard from "@/components/dashboards/admin-analytics-dashboard";
import { AdminAuditLogsPage } from "@/components/dashboards/admin-audit-logs-page";
import { SettingsPage } from "@/components/dashboards/settings-page";
import AdminMedicalRecordsPage from "@/components/dashboards/admin-medical-records-page";
import PatientMyRecordsPage from "@/components/dashboards/patient-my-records-page";
import { PatientUploadPage } from "@/components/dashboards/patient-upload-page";
import { PatientGrantAccessPage } from "@/components/dashboards/patient-grant-access-page";
import PatientSecurityPage from "@/components/dashboards/patient-security-page";
import DoctorMyPatientsPage from "@/components/dashboards/doctor-my-patients-page";
import DoctorAccessRequestsPage from "@/components/dashboards/doctor-access-requests-page";
import DoctorRecordsPage from "@/components/dashboards/doctor-records-page";
import StaffProfilePage from "@/components/dashboards/staff-profile-page";
import NurseAssignedPatientsPage from "@/components/dashboards/nurse-assigned-patients-page";
import NurseRecordsPage from "@/components/dashboards/nurse-records-page";

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

type Props = {
  params: Promise<{ locale: string; slug?: string[] }>;
  searchParams: Promise<{ period?: string }>;
};

export default async function DashboardSectionPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const query = await searchParams;
  const sessionUser = await getSession();

  if (sessionUser === null) {
    redirect({ href: "/auth/login", locale });
  }

  const user = sessionUser as User;
  const path = slug?.join("/") ?? "";

  const periodDays =
    query.period === "7" || query.period === "90" || query.period === "30"
      ? (Number(query.period) as 7 | 30 | 90)
      : 30;

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

  if (user.role === "admin") {
    if (path === "users") return <AdminUsersManagement />;
    if (path === "doctors") return <AdminDoctorsPanel />;
    if (path === "nurses") return <AdminNursesPanel />;
    if (path === "patients") return <AdminPatientsPanel />;
    if (path === "analytics") return <AdminAnalyticsDashboard />;
    if (path === "audit-logs") return <AdminAuditLogsPage />;
    if (path === "settings") return <SettingsPage user={user} isAdmin />;
    if (path === "records") return <AdminMedicalRecordsPage />;
    if (path === "") {
      return <AdminDashboard user={user} periodDays={periodDays} />;
    }
    const title = TITLES[path] ?? path.replace(/-/g, " ");
    return <DashboardPlaceholder title={title} />;
  }

  if (user.role === "patient") {
    if (path === "") {
      return <PatientDashboard user={user} periodDays={periodDays} />;
    }
    if (path === "my-records") return <PatientMyRecordsPage user={user} />;
    if (path === "upload") return <PatientUploadPage />;
    if (path === "grant-access") return <PatientGrantAccessPage />;
    if (path === "security") return <PatientSecurityPage user={user} />;
    const title = TITLES[path] ?? path.replace(/-/g, " ");
    return <DashboardPlaceholder title={title} />;
  }

  if (user.role === "doctor") {
    if (path === "") return <DoctorDashboard user={user} />;
    if (path === "my-patients") return <DoctorMyPatientsPage user={user} />;
    if (path === "access-requests") return <DoctorAccessRequestsPage user={user} />;
    if (path === "records") return <DoctorRecordsPage user={user} />;
    if (path === "profile") return <StaffProfilePage user={user} />;
    const title = TITLES[path] ?? path.replace(/-/g, " ");
    return <DashboardPlaceholder title={title} />;
  }

  if (user.role === "nurse") {
    if (path === "") return <NurseDashboard user={user} />;
    if (path === "assigned-patients") return <NurseAssignedPatientsPage user={user} />;
    if (path === "records") return <NurseRecordsPage user={user} />;
    if (path === "profile") return <StaffProfilePage user={user} />;
    const title = TITLES[path] ?? path.replace(/-/g, " ");
    return <DashboardPlaceholder title={title} />;
  }

  return <div>Dashboard not found</div>;
}
