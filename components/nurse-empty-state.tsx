import { Heart, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function NurseEmptyState({
  title = "Nurse workspace",
  description = "The nurse experience is being designed. Check back soon for assigned patients, records, and care workflows.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="surface-elevated w-full max-w-lg border-amber-200/60 dark:border-amber-900/40">
        <CardContent className="flex flex-col items-center gap-6 py-14 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse-ring" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <Heart className="h-8 w-8" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Coming soon
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
