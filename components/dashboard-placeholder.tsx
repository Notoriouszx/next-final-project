import { Construction, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export function DashboardPlaceholder({
  title,
  description = "This section is being polished. The shell, auth, and RBAC routing are already wired.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card className="border-dashed border-primary/25 bg-gradient-to-br from-primary/5 via-card to-info/5">
        <CardHeader className="text-center sm:text-start">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 sm:mx-0">
            <Construction className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 sm:justify-start">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Coming soon
          </CardTitle>
          <CardDescription className="max-w-xl">
            Connect server actions, tables, and dialogs here. Forms use{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">zod</code> +{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">react-hook-form</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground sm:text-start">
          You have access to this route — content will appear in a future release.
        </CardContent>
      </Card>
    </div>
  );
}
