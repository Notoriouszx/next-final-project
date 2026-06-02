"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  iconClassName?: string;
};

export function AppLogo({ className, iconClassName }: AppLogoProps) {
  return (
    <div
      className={cn(
        // 1. Added a gentle negative margin (-ml-1.5 or -ml-2) as the default base state.
        // This will pull it back to the left perfectly within your navbar padding.
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-950/25 transition-transform duration-200 hover:scale-105",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("h-6 w-6", iconClassName)}
      >
        <path d="M3 12h3l3-9 4 18 3-12h4" />
      </svg>
    </div>
  );
}
