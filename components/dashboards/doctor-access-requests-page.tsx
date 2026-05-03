import { User } from "@/lib/types";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DoctorAccessRequestsPage({ user }: { user: User }) {
  const pending = await prisma.accessGrant.findMany({
    where: { doctorId: user.id, status: "pending" },
    include: { patient: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Access requests</h1>
        <p className="text-muted-foreground">Pending invitations from patients</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pending</CardTitle>
          <CardDescription>{pending.length} open</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            pending.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{p.patient.name}</p>
                  <p className="text-muted-foreground text-sm">{p.patient.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested {p.createdAt.toLocaleString()}
                  </p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
