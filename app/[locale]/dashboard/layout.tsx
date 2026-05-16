import { redirect } from "@/i18n/navigation";
import { Navbar } from "@/components/navbar";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSession } from "@/lib/session";
import type { User } from "@/lib/types";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sessionUser = await getSession();

  if (sessionUser === null) {
    redirect({ href: "/auth/login", locale });
  }

  const user = sessionUser as User;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/40">
      <Navbar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
      <DashboardShell role={user.role}>{children}</DashboardShell>
    </div>
  );
}
