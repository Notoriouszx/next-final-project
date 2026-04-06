import { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Users,
  Activity,
  FileText,
  UserPlus,
  TrendingUp,
  CircleAlert as AlertCircle,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { AdminCharts } from "./admin-charts";

interface AdminDashboardProps {
  user: User;
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

export default async function AdminDashboard({ user }: AdminDashboardProps) {
  const axis = buildDayAxis(14);
  const since = new Date(axis[0].key);

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
    prisma.user.count(),
    prisma.user.count({ where: { role: "doctor" } }),
    prisma.medicalRecord.count(),
    prisma.user.count({ where: { role: "patient" } }),
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
    usersInRange.map((u) => u.createdAt),
    axis
  );
  const recordsPerDay = countsPerDay(
    recordsInRange.map((r) => r.createdAt),
    axis
  );

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      description: "All registered users",
      trend: "+12.5%",
    },
    {
      title: "Active Doctors",
      value: totalDoctors,
      icon: Activity,
      description: "Verified doctors",
      trend: "+4.2%",
    },
    {
      title: "Medical Records",
      value: totalRecords,
      icon: FileText,
      description: "Total records uploaded",
      trend: "+23.1%",
    },
    {
      title: "Patients",
      value: totalPatients,
      icon: UserPlus,
      description: "Registered patients",
      trend: "+8.7%",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-primary/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <div className="mt-2 flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="me-1 h-3 w-3" />
                  {stat.trend} from last month
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                recentActivities.map((activity) => (
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
                ))
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
                    {totalUsers} total accounts in the system.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Latest user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers.map((u) => (
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
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No users yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
