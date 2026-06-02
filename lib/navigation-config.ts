import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FileText,
  UserPlus,
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
  labelKey: string;
  icon: LucideIcon;
  /** Route segment after /dashboard (empty = home) */
  segment: string;
};

const adminNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", labelKey: "dashboard", icon: LayoutDashboard, segment: "" },
  { href: "/dashboard/users", label: "Users", labelKey: "users", icon: Users, segment: "users" },
  { href: "/dashboard/doctors", label: "Doctors", labelKey: "doctors", icon: Stethoscope, segment: "doctors" },
  { href: "/dashboard/nurses", label: "Nurses", labelKey: "nurses", icon: Heart, segment: "nurses" },
  { href: "/dashboard/patients", label: "Patients", labelKey: "patients", icon: UserPlus, segment: "patients" },
  { href: "/dashboard/records", label: "Records", labelKey: "records", icon: FileText, segment: "records" },
  { href: "/dashboard/analytics", label: "Analytics", labelKey: "analytics", icon: BarChart3, segment: "analytics" },
  { href: "/dashboard/audit-logs", label: "Audit logs", labelKey: "auditLogs", icon: Shield, segment: "audit-logs" },
  { href: "/dashboard/settings", label: "Settings", labelKey: "settings", icon: Settings, segment: "settings" },
];

const doctorNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", labelKey: "dashboard", icon: LayoutDashboard, segment: "" },
  { href: "/dashboard/my-patients", label: "My patients", labelKey: "myPatients", icon: Users, segment: "my-patients" },
  { href: "/dashboard/access-requests", label: "Access requests", labelKey: "accessRequests", icon: Key, segment: "access-requests" },
  { href: "/dashboard/records", label: "Records", labelKey: "records", icon: FileText, segment: "records" },
  { href: "/dashboard/profile", label: "Profile", labelKey: "profile", icon: Settings, segment: "profile" },
];

const nurseNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", labelKey: "dashboard", icon: LayoutDashboard, segment: "" },
  { href: "/dashboard/assigned-patients", label: "Assigned patients", labelKey: "assignedPatients", icon: Users, segment: "assigned-patients" },
  { href: "/dashboard/records", label: "Records", labelKey: "records", icon: FileText, segment: "records" },
  { href: "/dashboard/profile", label: "Profile", labelKey: "profile", icon: Settings, segment: "profile" },
];

const patientNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", labelKey: "dashboard", icon: LayoutDashboard, segment: "" },
  { href: "/dashboard/my-records", label: "My records", labelKey: "myRecords", icon: FileText, segment: "my-records" },
  { href: "/dashboard/upload", label: "Upload", labelKey: "upload", icon: Upload, segment: "upload" },
  { href: "/dashboard/grant-access", label: "Grant access", labelKey: "grantAccess", icon: Key, segment: "grant-access" },
  { href: "/dashboard/security", label: "Security", labelKey: "security", icon: Shield, segment: "security" },
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
