"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function Spinner({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizes = { sm: "h-4 w-4", default: "h-6 w-6", lg: "h-10 w-10" };
  return (
    <Loader2
      className={cn("animate-spin text-primary", sizes[size], className)}
      aria-hidden
    />
  );
}

export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

export function PageLoader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[40vh] flex-col items-center justify-center gap-4", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-card shadow-lg">
          <Spinner size="lg" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={`h-${i}`} className="h-8 flex-1 rounded-lg animate-shimmer" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={`${r}-${c}`} className="h-10 flex-1 rounded-lg animate-shimmer opacity-80" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingOverlay({
  show,
  label,
  className,
}: {
  show: boolean;
  label?: string;
  className?: string;
}) {
  if (!show) return null;
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/75 backdrop-blur-sm",
        className
      )}
    >
      <Spinner size="lg" />
      {label ? <p className="text-sm font-medium text-muted-foreground">{label}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  indeterminate,
}: {
  value?: number;
  className?: string;
  indeterminate?: boolean;
}) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-primary via-info to-primary transition-all duration-300 ease-out",
          indeterminate && "w-1/3 animate-shimmer"
        )}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
      />
    </div>
  );
}
