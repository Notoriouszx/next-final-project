import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FileText,
  UserPlus,
  Activity,
  Settings,
  ChartBar as BarChart3,
  Shield,
  Upload,
  Key,
  Stethoscope,
  Heart,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import { canAccessRoute } from "@/lib/rbac";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Route segment after /dashboard (empty = home) */
  segment: string;
};

const adminNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, segment: "" },
  { href: "/dashboard/users", label: "Users", icon: Users, segment: "users" },
  { href: "/dashboard/doctors", label: "Doctors", icon: Stethoscope, segment: "doctors" },
  { href: "/dashboard/nurses", label: "Nurses", icon: Heart, segment: "nurses" },
  { href: "/dashboard/patients", label: "Patients", icon: UserPlus, segment: "patients" },
  { href: "/dashboard/records", label: "Records", icon: FileText, segment: "records" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, segment: "analytics" },
  { href: "/dashboard/audit-logs", label: "Audit logs", icon: Shield, segment: "audit-logs" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, segment: "settings" },
];

const doctorNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, segment: "" },
  { href: "/dashboard/my-patients", label: "My patients", icon: Users, segment: "my-patients" },
  { href: "/dashboard/access-requests", label: "Access requests", icon: Key, segment: "access-requests" },
  { href: "/dashboard/records", label: "Records", icon: FileText, segment: "records" },
  { href: "/dashboard/profile", label: "Profile", icon: Settings, segment: "profile" },
];

const nurseNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, segment: "" },
  { href: "/dashboard/assigned-patients", label: "Assigned patients", icon: Users, segment: "assigned-patients" },
  { href: "/dashboard/records", label: "Records", icon: FileText, segment: "records" },
  { href: "/dashboard/profile", label: "Profile", icon: Settings, segment: "profile" },
];

const patientNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, segment: "" },
  { href: "/dashboard/my-records", label: "My records", icon: FileText, segment: "my-records" },
  { href: "/dashboard/upload", label: "Upload", icon: Upload, segment: "upload" },
  { href: "/dashboard/grant-access", label: "Grant access", icon: Key, segment: "grant-access" },
  { href: "/dashboard/security", label: "Security", icon: Shield, segment: "security" },
];

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: adminNav,
  doctor: doctorNav,
  nurse: nurseNav,
  patient: patientNav,
};

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_BY_ROLE[role].filter((item) => canAccessRoute(role, item.segment));
}

export const ROLE_ACCENT: Record<UserRole, string> = {
  admin: "from-violet-500 to-indigo-600",
  doctor: "from-sky-500 to-cyan-600",
  nurse: "from-amber-500 to-orange-500",
  patient: "from-emerald-500 to-teal-600",
};
