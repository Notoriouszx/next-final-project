"use client";

import type { UserRole } from "@/lib/types";
import { Sidebar } from "@/components/sidebar";
import { RealtimeBridge } from "@/components/realtime-bridge";

export function DashboardShell({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  return (
    <div className="group/shell flex w-full">
      <Sidebar role={role} />
      <main className="mt-16 ms-16 min-h-[calc(100vh-4rem)] min-w-0 flex-1 p-6 transition-[margin-inline-start] duration-300 ease-in-out group-hover/shell:ms-64 md:p-8">
        <RealtimeBridge />
        {children}
      </main>
    </div>
  );
}
