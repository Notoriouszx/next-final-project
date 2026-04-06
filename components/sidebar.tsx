"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, UserPlus, Activity, Settings, ChartBar as BarChart3, Shield, Upload, Key, Stethoscope, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types";

interface SidebarProps {
  role: UserRole;
}

const menuItems: Record<UserRole, Array<{ href: string; label: string; icon: React.ElementType }>> = {
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
    <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-background">
      <div className="flex h-full flex-col gap-2 p-4">
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
