"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GooeyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

const GooeyInput = React.forwardRef<HTMLInputElement, GooeyInputProps>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn("group relative overflow-hidden rounded-lg", wrapperClassName)}>
      <span className="pointer-events-none absolute -start-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-primary/20 blur-xl transition-transform duration-700 group-focus-within:translate-x-10" />
      <span className="pointer-events-none absolute end-6 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-info/25 blur-md transition-transform duration-700 group-focus-within:-translate-x-6" />
      <Search className="pointer-events-none absolute start-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
      <input
        ref={ref}
        className={cn(
          "relative z-0 flex h-11 w-full rounded-lg border border-input bg-background/80 px-3 py-2 ps-10 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/70 dark:bg-black/70",
          className
        )}
        {...props}
      />
    </div>
  )
);
GooeyInput.displayName = "GooeyInput";

export { GooeyInput };

