import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { ROLE_ACCENT } from "@/lib/navigation-config";

export function PageHeader({
  title,
  description,
  role,
  children,
  className,
}: {
  title: string;
  description?: string;
  role?: UserRole;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        {role ? (
          <div
            className={cn(
              "inline-flex h-1 w-12 rounded-full bg-gradient-to-r",
              ROLE_ACCENT[role]
            )}
          />
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
