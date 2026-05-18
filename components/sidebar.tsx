"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types";
import { Link, usePathname } from "@/i18n/navigation";
import { getNavItemsForRole, ROLE_ACCENT } from "@/lib/navigation-config";
import { roleBadgeVariant } from "@/lib/role-badge";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = getNavItemsForRole(role);
  const dashboardPath = pathname.split("/dashboard")[1] ?? "";
  const currentSegment = dashboardPath.split("/").filter(Boolean)[0] ?? "";

  return (
    <aside
      className={cn(
        "peer/sbar group/sbar fixed start-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-[4.25rem] flex-col overflow-hidden border-e border-border/80 bg-card/90 shadow-sm backdrop-blur-md transition-[width] duration-300 ease-out hover:w-64 md:w-16 md:hover:w-64"
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 end-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent opacity-0 transition-opacity group-hover/sbar:opacity-100" />

      <div className="flex h-full flex-col gap-2 overflow-y-auto overflow-x-hidden p-2.5">
        <div className="mb-1 hidden px-1 opacity-0 transition-opacity group-hover/sbar:opacity-100 md:block">
          <Badge variant={roleBadgeVariant(role)} className="capitalize">
            {role}
          </Badge>
        </div>

        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.segment === ""
                ? currentSegment === ""
                : currentSegment === item.segment;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "group/item relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? cn(
                        "bg-gradient-to-r text-white shadow-md",
                        ROLE_ACCENT[role],
                        "shadow-black/10"
                      )
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-[1.125rem] w-[1.125rem] shrink-0",
                    isActive ? "text-white" : "text-primary/70 group-hover/item:text-primary"
                  )}
                />
                <span className="min-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover/sbar:opacity-100 ltr:-translate-x-1 group-hover/sbar:ltr:translate-x-0 rtl:translate-x-1 group-hover/sbar:rtl:translate-x-0">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-dashed border-primary/15 bg-gradient-to-br from-primary/5 to-info/5 p-3">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Activity className="h-4 w-4 shrink-0 text-primary" />
            <span className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover/sbar:opacity-100">
              <span className="text-red-500">Medi</span>Care
            </span>
          </div>
          <p className="mt-1 overflow-hidden whitespace-nowrap text-[11px] leading-snug text-muted-foreground opacity-0 transition-opacity duration-300 group-hover/sbar:opacity-100">
            Secure health portal
          </p>
        </div>
      </div>
    </aside>
  );
}
