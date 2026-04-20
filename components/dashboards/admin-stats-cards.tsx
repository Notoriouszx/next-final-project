"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  FileText,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatItem = {
  title: string;
  value: number;
  description: string;
  trend: string;
  iconKey: "users" | "doctors" | "records" | "patients";
};

const iconMap = {
  users: Users,
  doctors: Activity,
  records: FileText,
  patients: UserPlus,
} as const;

function useAnimatedNumber(target: number, duration = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function parseTrend(value: string) {
  return value.startsWith("-") ? "down" : "up";
}

export function AdminStatsCards({ stats, periodLabel }: { stats: StatItem[]; periodLabel: string }) {
  const safeStats = useMemo(() => stats, [stats]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {safeStats.map((stat) => (
        <StatCard key={stat.title} stat={stat} periodLabel={periodLabel} />
      ))}
    </div>
  );
}

function StatCard({ stat, periodLabel }: { stat: StatItem; periodLabel: string }) {
  const Icon = iconMap[stat.iconKey];
  const animated = useAnimatedNumber(stat.value);
  const direction = parseTrend(stat.trend);

  return (
    <Card className="border-primary/10 shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{animated}</div>
        <p className="text-xs text-muted-foreground">{stat.description}</p>
        <div
          className={cn(
            "mt-2 flex items-center text-xs",
            direction === "up"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          {direction === "up" ? (
            <TrendingUp className="me-1 h-3 w-3" />
          ) : (
            <TrendingDown className="me-1 h-3 w-3" />
          )}
          {stat.trend} vs previous {periodLabel}
        </div>
      </CardContent>
    </Card>
  );
}
