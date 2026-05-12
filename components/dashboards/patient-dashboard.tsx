import { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FileText, Key, Shield, AlertTriangle } from "lucide-react";
import prisma from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { PatientMiniActivityChart } from "./patient-mini-activity-chart";
import { PatientAccessRevokeButton } from "./patient-access-revoke-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { roleBadgeVariant } from "@/lib/role-badge";

interface PatientDashboardProps {
  user: User;
  periodDays: 7 | 30 | 90;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function PatientDashboard({ user, periodDays }: PatientDashboardProps) {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - periodDays);

  const activeGrantWhere = {
    patientId: user.id,
    status: "active" as const,
    expiresAt: { gt: now },
  };

  const [
    recentRecords,
    totalRecords,
    recordsInPeriod,
    activeGrants,
    totalGrants,
    activityRecords,
    lastGrant,
    securityAudits,
  ] = await Promise.all([
    prisma.medicalRecord.findMany({
      where: { patientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.medicalRecord.count({ where: { patientId: user.id } }),
    prisma.medicalRecord.count({
      where: { patientId: user.id, createdAt: { gte: periodStart } },
    }),
    prisma.accessGrant.findMany({
      where: activeGrantWhere,
      include: { doctor: true, nurse: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.accessGrant.count({ where: { patientId: user.id } }),
    prisma.medicalRecord.findMany({
      where: { patientId: user.id, createdAt: { gte: periodStart } },
      select: { createdAt: true },
    }),
    prisma.accessGrant.findFirst({
      where: { patientId: user.id, status: "active" },
      orderBy: { createdAt: "desc" },
      include: { doctor: true, nurse: true },
    }),
    prisma.auditLog.findMany({
      where: {
        userId: user.id,
        category: "SECURITY",
      },
      orderBy: { timestamp: "desc" },
      take: 5,
    }),
  ]);

  const dayLabels: { key: string; label: string }[] = [];
  for (let i = Math.min(periodDays, 14) - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dayLabels.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  const countsByDay = new Map(dayLabels.map((d) => [d.key, 0]));
  for (const r of activityRecords) {
    const key = startOfDay(r.createdAt).toISOString().slice(0, 10);
    if (countsByDay.has(key)) {
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }
  }
  const sparkData = dayLabels.map((d) => ({
    label: d.label,
    count: countsByDay.get(d.key) ?? 0,
  }));

  const lastGrantLabel = lastGrant
    ? `${lastGrant.doctor?.name ?? lastGrant.nurse?.name ?? "Provider"} · ${lastGrant.createdAt.toLocaleDateString()}`
    : "No active grants yet";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              {recordsInPeriod} uploaded in last {periodDays} days
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Access</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGrants.length}</div>
            <p className="text-xs text-muted-foreground">Non-expired grants</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.two_factor_enabled ? "On" : "Off"}</div>
            <p className="text-xs text-muted-foreground">2FA status</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grants</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGrants}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Medical Records</CardTitle>
            <CardDescription>Your latest uploaded documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecords.length > 0 ? (
                recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                  >
                    <FileText className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{record.fileName ?? "Record"}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.description ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No records uploaded yet — use Upload Record in the sidebar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Active access</CardTitle>
            <CardDescription>Who can view your records right now</CardDescription>
          </CardHeader>
          <CardContent>
            {activeGrants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active access — grant a provider from the sidebar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-end">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeGrants.map((grant) => {
                    const provider = grant.doctor ?? grant.nurse;
                    const role = grant.doctorId ? "doctor" : "nurse";
                    return (
                      <TableRow key={grant.id}>
                        <TableCell className="font-medium">{provider?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge className="capitalize" variant={roleBadgeVariant(role)}>
                            {role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {grant.createdAt.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {grant.expiresAt.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-end">
                          <PatientAccessRevokeButton grantId={grant.id} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Activity summary</CardTitle>
            <CardDescription>Uploads in the recent window</CardDescription>
          </CardHeader>
          <CardContent>
            <PatientMiniActivityChart data={sparkData} />
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Last access granted</CardTitle>
            <CardDescription>Most recent active grant</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium leading-relaxed">{lastGrantLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Security alerts</CardTitle>
            <CardDescription>Recent security-related audit events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityAudits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent security events.</p>
              ) : (
                securityAudits.map((a) => (
                  <div key={a.id} className="flex gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-medium">{a.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
