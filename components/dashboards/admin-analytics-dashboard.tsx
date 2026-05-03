import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import { AdminAnalyticsCharts } from "./admin-analytics-charts";

function buildDayLabels(days: number) {
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

export default async function AdminAnalyticsDashboard() {
  const now = new Date();
  const axis90 = buildDayLabels(90);
  const since90 = new Date(axis90[0].key);
  const axis30 = buildDayLabels(30);
  const since30 = new Date(axis30[0].key);

  const [
    usersInRange,
    recordsInRange,
    roleGroups,
    grantsInRange,
    heatmapLogs,
    auditForTop,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: since90 } },
      select: { createdAt: true },
    }),
    prisma.medicalRecord.findMany({
      where: { createdAt: { gte: since90 } },
      select: { createdAt: true },
    }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
    prisma.accessGrant.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { timestamp: { gte: subDays(now, 7) } },
      select: { timestamp: true },
    }),
    prisma.auditLog.groupBy({
      by: ["userId"],
      where: { userId: { not: null }, timestamp: { gte: since90 } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 12,
    }),
  ]);

  const userGrowth = countsPerDay(
    usersInRange.map((u) => u.createdAt),
    axis90
  );
  const recordsGrowth = countsPerDay(
    recordsInRange.map((r) => r.createdAt),
    axis90
  );
  const grantsPerDay = countsPerDay(
    grantsInRange.map((g) => g.createdAt),
    axis30
  );

  const roleDistribution = roleGroups.map((g) => ({
    name: g.role,
    value: g._count.role,
  }));

  const heatStart = startOfDay(subDays(now, 6));
  const dayLabels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(heatStart);
    d.setDate(d.getDate() + i);
    dayLabels.push(d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }));
  }
  const grid: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
  for (const log of heatmapLogs) {
    const dayIdx = Math.floor(
      (startOfDay(log.timestamp).getTime() - heatStart.getTime()) / 86_400_000
    );
    if (dayIdx < 0 || dayIdx > 6) continue;
    const hour = log.timestamp.getHours();
    grid[hour][dayIdx]++;
  }
  const maxHeat = Math.max(1, ...grid.flat());

  const topIds = auditForTop.map((t) => t.userId).filter(Boolean) as string[];
  const topUsersRows = await prisma.user.findMany({
    where: { id: { in: topIds } },
    select: { id: true, name: true, role: true },
  });
  const topUsers = auditForTop
    .map((t) => {
      const u = topUsersRows.find((r) => r.id === t.userId);
      if (!u) return null;
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        count: t._count.id,
      };
    })
    .filter(Boolean) as {
    id: string;
    name: string;
    role: string;
    count: number;
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Operational intelligence across the platform</p>
      </div>
      <AdminAnalyticsCharts
        userGrowth={userGrowth}
        recordsGrowth={recordsGrowth}
        roleDistribution={roleDistribution}
        grantsPerDay={grantsPerDay}
        heatmap={{ grid, max: maxHeat, dayLabels }}
        topUsers={topUsers}
      />
    </div>
  );
}
