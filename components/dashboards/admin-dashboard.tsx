import { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Activity, CircleAlert as AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { AdminCharts } from "./admin-charts";
import { AdminStatsCards } from "./admin-stats-cards";
import { Link } from "@/i18n/navigation";

interface AdminDashboardProps {
  user: User;
  periodDays?: 7 | 30 | 90;
}

function buildDayAxis(days: number) {
  const axis: { key: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    axis.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  return axis;
}

function countsPerDay(dates: Date[], axis: { key: string; label: string }[]) {
  const map = new Map(axis.map((a) => [a.key, 0]));
  for (const dt of dates) {
    const key = new Date(dt).toISOString().slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return axis.map((a) => ({ label: a.label, value: map.get(a.key) ?? 0 }));
}

export default async function AdminDashboard({
  user,
  periodDays = 30,
}: AdminDashboardProps) {
  const axis = buildDayAxis(periodDays);
  const since = new Date(axis[0].key);

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - periodDays);
  const previousStart = new Date(now);
  previousStart.setDate(now.getDate() - periodDays * 2);

  const currentRange = { gte: currentStart, lt: now };
  const previousRange = { gte: previousStart, lt: currentStart };

  const [
    totalUsers,
    totalDoctors,
    totalRecords,
    totalPatients,
    recentActivities,
    recentUsers,
    usersInRange,
    recordsInRange,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: currentRange } }),
    prisma.user.count({
      where: { role: "doctor", isActive: true, createdAt: currentRange },
    }),
    prisma.medicalRecord.count({ where: { createdAt: currentRange } }),
    prisma.user.count({ where: { role: "patient", createdAt: currentRange } }),
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.medicalRecord.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const userGrowth = countsPerDay(
    usersInRange.map((u: { createdAt: Date }) => u.createdAt),
    axis
  );
  const recordsPerDay = countsPerDay(
    recordsInRange.map((r: { createdAt: Date }) => r.createdAt),
    axis
  );

  const [prevUsers, prevDoctors, prevPatients, prevRecords] = await Promise.all([
    prisma.user.count({ where: { createdAt: previousRange } }),
    prisma.user.count({
      where: { role: "doctor", isActive: true, createdAt: previousRange },
    }),
    prisma.user.count({ where: { role: "patient", createdAt: previousRange } }),
    prisma.medicalRecord.count({ where: { createdAt: previousRange } }),
  ]);

  const formatChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? "+100%" : "0%";
    }
    const value = ((current - previous) / previous) * 100;
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? "+" : ""}${rounded}%`;
  };

  const analytics = {
    totalUsers: { value: totalUsers, change: formatChange(totalUsers, prevUsers) },
    doctors: { value: totalDoctors, change: formatChange(totalDoctors, prevDoctors) },
    patients: { value: totalPatients, change: formatChange(totalPatients, prevPatients) },
    records: { value: totalRecords, change: formatChange(totalRecords, prevRecords) },
  };

  const stats = [
    {
      title: "Total Users",
      value: analytics.totalUsers.value,
      iconKey: "users" as const,
      description: `Created in last ${periodDays} days`,
      trend: analytics.totalUsers.change,
    },
    {
      title: "Active Doctors",
      value: analytics.doctors.value,
      iconKey: "doctors" as const,
      description: "Active doctors in selected period",
      trend: analytics.doctors.change,
    },
    {
      title: "Medical Records",
      value: analytics.records.value,
      iconKey: "records" as const,
      description: "Records uploaded in selected period",
      trend: analytics.records.change,
    },
    {
      title: "Patients",
      value: analytics.patients.value,
      iconKey: "patients" as const,
      description: "New patients in selected period",
      trend: analytics.patients.change,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <div className="flex items-center gap-2">
        {[7, 30, 90].map((days) => (
          <Link
            key={days}
            href={{ pathname: "/dashboard", query: { period: String(days) } }}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              periodDays === days
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-accent"
            }`}
          >
            {days}d
          </Link>
        ))}
      </div>

      <AdminStatsCards stats={stats} periodLabel={`${periodDays} days`} />

      <AdminCharts userGrowth={userGrowth} recordsPerDay={recordsPerDay} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activities and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map(
                  (activity: { id: string; action: string; timestamp: Date }) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 border-s-2 border-primary/25 ps-3 transition-colors hover:border-primary/50"
                  >
                    <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  )
                )
              ) : (
                <p className="text-sm text-muted-foreground">No recent activities</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Important notifications and warnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Compliance reminder</p>
                  <p className="text-xs text-muted-foreground">
                    Review audit logs weekly for PHI access patterns.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-sky-50 p-3 dark:bg-sky-950/30">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">New registrations</p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.totalUsers.value} new accounts in selected period.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Latest user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers.map(
                (u: {
                  id: string;
                  name: string;
                  email: string;
                  role: string;
                  createdAt: Date;
                }) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">
                      {u.role}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {u.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                )
              )
            ) : (
              <p className="text-sm text-muted-foreground">No users yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
