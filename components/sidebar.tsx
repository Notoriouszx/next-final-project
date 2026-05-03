"use client";

import * as React from "react";
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
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types";
import { Link, usePathname } from "@/i18n/navigation";

interface SidebarProps {
  role: UserRole;
}

const menuItems: Record<
  UserRole,
  Array<{ href: string; label: string; icon: React.ElementType }>
> = {
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/users", label: "Users Management", icon: Users },
    { href: "/dashboard/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/dashboard/nurses", label: "Nurses", icon: Heart },
    { href: "/dashboard/patients", label: "Patients", icon: UserPlus },
    { href: "/dashboard/records", label: "Medical Records", icon: FileText },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/audit-logs", label: "Audit Logs", icon: Shield },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ],
  doctor: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/my-patients", label: "My Patients", icon: Users },
    { href: "/dashboard/access-requests", label: "Access Requests", icon: Key },
    { href: "/dashboard/records", label: "Medical Records", icon: FileText },
    { href: "/dashboard/profile", label: "Profile", icon: Settings },
  ],
  nurse: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/assigned-patients", label: "Assigned Patients", icon: Users },
    { href: "/dashboard/records", label: "Records Viewer", icon: FileText },
    { href: "/dashboard/profile", label: "Profile", icon: Settings },
  ],
  patient: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/my-records", label: "My Records", icon: FileText },
    { href: "/dashboard/upload", label: "Upload Record", icon: Upload },
    { href: "/dashboard/grant-access", label: "Grant Access", icon: Key },
    { href: "/dashboard/security", label: "Security Settings", icon: Shield },
  ],
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = menuItems[role] || [];

  return (
    <aside
      className={cn(
        "group/sbar fixed start-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-16 flex-col overflow-hidden border-e border-primary/10 bg-background/95 backdrop-blur transition-[width] duration-300 ease-in-out hover:w-64"
      )}
    >
      <div className="flex h-full flex-col gap-2 overflow-y-auto overflow-x-hidden p-3">
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "min-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[opacity,transform] duration-300 ease-in-out group-hover/sbar:translate-x-0 group-hover/sbar:opacity-100 ltr:-translate-x-1 rtl:translate-x-1"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Activity className="h-4 w-4 shrink-0 text-primary" />
            <span className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-300 ease-in-out group-hover/sbar:opacity-100">
              MediCare
            </span>
          </div>
          <p className="mt-1 overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-300 ease-in-out group-hover/sbar:opacity-100">
            Secure health portal — v1.3
          </p>
        </div>
      </div>
    </aside>
  );
}
