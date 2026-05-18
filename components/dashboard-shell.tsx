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
    <div className="flex w-full">
      <Sidebar role={role} />
      <main className="mt-16 ms-[4.25rem] min-h-[calc(100vh-4rem)] min-w-0 flex-1 p-4 transition-[margin-inline-start] duration-300 ease-out peer-hover/sbar:ms-64 sm:p-6 md:p-8">
        <RealtimeBridge />
        {children}
      </main>
    </div>
  );
}
