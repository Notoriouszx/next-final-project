import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/dashboards/admin-dashboard";
import DoctorDashboard from "@/components/dashboards/doctor-dashboard";
import NurseDashboard from "@/components/dashboards/nurse-dashboard";
import PatientDashboard from "@/components/dashboards/patient-dashboard";

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect("/auth/login");
  }

  const dashboards = {
    admin: <AdminDashboard user={user} />,
    doctor: <DoctorDashboard user={user} />,
    nurse: <NurseDashboard user={user} />,
    patient: <PatientDashboard user={user} />,
  };

  return dashboards[user.role] || <div>Dashboard not found</div>;
}
