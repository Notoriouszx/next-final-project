import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      <div className="flex">
        <Sidebar role={user.role} />
        <main className="flex-1 ml-64 p-8 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
