"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { greenButtonClass } from "@/lib/control-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  ResolveAccessDialog,
  type PendingGrantRow,
} from "@/components/doctor/resolve-access-dialog";

export function DoctorAccessRequestsClient({
  pending,
}: {
  pending: PendingGrantRow[];
}) {
  const [selected, setSelected] = useState<PendingGrantRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openResolve = (row: PendingGrantRow) => {
    setSelected(row);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        role="doctor"
        title="Access requests"
        description="Pending invitations from patients — resolve with OTP or magic link."
      />

      <Card>
        <CardHeader>
          <CardTitle>Pending</CardTitle>
          <CardDescription>{pending.length} open</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending requests.
            </p>
          ) : (
            pending.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/50 p-4 transition-colors hover:bg-accent/30"
              >
                <div className="min-w-0">
                  <p className="font-medium">{p.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.patientEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="warning"
                    className="rounded-full border border-amber-600/50 bg-amber-950/40 px-3 py-1 text-sm font-medium text-amber-500"
                  >
                    Pending
                  </Badge>
                  <Button
                    variant="success"
                    size="sm"
                    className={`${greenButtonClass} border border-green-700`}
                    onClick={() => openResolve(p)}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ResolveAccessDialog
        grant={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
