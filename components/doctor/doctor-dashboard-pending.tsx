"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  ResolveAccessDialog,
  type PendingGrantRow,
} from "@/components/doctor/resolve-access-dialog";

export function DoctorDashboardPending({
  pending,
}: {
  pending: PendingGrantRow[];
}) {
  const [selected, setSelected] = useState<PendingGrantRow | null>(null);
  const [open, setOpen] = useState(false);

  if (pending.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending requests</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {pending.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium">
                  {request.patientName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{request.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Pending
              </span>
              <Button
                size="sm"
                variant="success"
                className="hover:brightness-110"
                onClick={() => {
                  setSelected(request);
                  setOpen(true);
                }}
              >
                Resolve
              </Button>
            </div>
          </div>
        ))}
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href="/dashboard/access-requests">View all requests</Link>
        </Button>
      </div>
      <ResolveAccessDialog grant={selected} open={open} onOpenChange={setOpen} />
    </>
  );
}
