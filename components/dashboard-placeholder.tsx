import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DashboardPlaceholder({
  title,
  description = "This section is scaffolded for your workflows — connect Prisma actions and forms here.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card className="border-dashed border-primary/20 bg-primary/[0.03]">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Wire this view to your server actions, tables, and dialogs. The layout, auth,
            and RBAC shell are ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tip: use <code className="rounded bg-muted px-1 py-0.5">zod</code> +{" "}
          <code className="rounded bg-muted px-1 py-0.5">react-hook-form</code> for
          production forms.
        </CardContent>
      </Card>
    </div>
  );
}
