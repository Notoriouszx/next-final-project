"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const PIE_COLORS = ["#7c3aed", "#2563eb", "#ea580c", "#16a34a"];

type Props = {
  userGrowth: { label: string; value: number }[];
  recordsGrowth: { label: string; value: number }[];
  roleDistribution: { name: string; value: number }[];
  grantsPerDay: { label: string; value: number }[];
  heatmap: { grid: number[][]; max: number; dayLabels: string[] };
  topUsers: { id: string; name: string; role: string; count: number }[];
};

function HeatmapGrid({
  grid,
  max,
  dayLabels,
}: {
  grid: number[][];
  max: number;
  dayLabels: string[];
}) {
  const intensity = (n: number) => {
    if (max === 0) return "bg-muted";
    const t = n / max;
    if (t < 0.15) return "bg-emerald-900/20 dark:bg-emerald-500/15";
    if (t < 0.35) return "bg-emerald-700/35 dark:bg-emerald-500/35";
    if (t < 0.55) return "bg-emerald-600/50 dark:bg-emerald-400/45";
    if (t < 0.75) return "bg-emerald-500/70 dark:bg-emerald-400/65";
    return "bg-emerald-500 dark:bg-emerald-400";
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full flex-col gap-0.5">
        <div className="flex gap-0.5 ps-10">
          {dayLabels.map((d) => (
            <div key={d} className="w-8 shrink-0 text-center text-[10px] text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        {grid.map((row, h) => (
          <div key={h} className="flex items-center gap-0.5">
            <span className="w-9 shrink-0 text-end text-[10px] text-muted-foreground">
              {h}h
            </span>
            {row.map((cell, d) => (
              <div
                key={`${h}-${d}`}
                title={`${dayLabels[d]} ${h}:00 — ${cell} events`}
                className={`h-4 w-8 shrink-0 rounded-sm ${intensity(cell)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAnalyticsCharts({
  userGrowth,
  recordsGrowth,
  roleDistribution,
  grantsPerDay,
  heatmap,
  topUsers,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System overview — user growth</CardTitle>
            <CardDescription>New registrations per day</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System overview — records growth</CardTitle>
            <CardDescription>Medical records uploaded per day</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recordsGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#16a34a"
                  fill="#16a34a"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Role distribution</CardTitle>
            <CardDescription>Users by role</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {roleDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access patterns</CardTitle>
            <CardDescription>Access grants created per day</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grantsPerDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity heatmap</CardTitle>
          <CardDescription>Audit events by hour (rows) and day (columns), last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <HeatmapGrid grid={heatmap.grid} max={heatmap.max} dayLabels={heatmap.dayLabels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top active users</CardTitle>
          <CardDescription>Most audit events in the last 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-end">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(u.role)} className="capitalize">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">{u.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
