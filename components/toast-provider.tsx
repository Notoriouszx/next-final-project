"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToastInput = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

type Toast = ToastInput & { id: string };

const ToastContext = React.createContext<{
  toast: (t: ToastInput) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return { toast: (_t: ToastInput) => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: ToastInput) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
    setToasts((s) => [...s, { ...t, id }]);
    window.setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 end-4 z-[100] flex max-w-sm flex-col gap-2 p-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded-lg border bg-background/95 p-4 text-foreground shadow-lg backdrop-blur dark:border-border",
              t.variant === "destructive" && "border-destructive/50 bg-destructive/10"
            )}
          >
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description ? (
              <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
