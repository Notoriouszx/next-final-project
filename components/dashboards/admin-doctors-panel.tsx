"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton, LoadingOverlay } from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { biometricStatusBadge, resolveBiometricStatus } from "@/lib/biometric-status";

const addDoctorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(3),
});

type AddDoctorInput = z.infer<typeof addDoctorSchema>;
type DoctorItem = {
  id: string;
  name: string;
  email: string;
  enrolled: boolean;
  verified: boolean;
  patientsCount: number;
  lastActivity: string | null;
};

type DoctorProfile = {
  assignedPatients: Array<{ id: string; name: string; email: string; grantedAt: string }>;
  accessLogs: Array<{ id: string; action: string; timestamp: string }>;
  timeline: Array<{ action: string; at: string }>;
};

export function AdminDoctorsPanel() {
  const [items, setItems] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AddDoctorInput>({
    resolver: zodResolver(addDoctorSchema),
    defaultValues: { name: "", email: "", username: "" },
  });

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/doctors");
      const data = (await res.json()) as { items?: DoctorItem[] };
      setItems(data.items ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/admin/doctors/${selectedId}`)
      .then((r) => r.json())
      .then(setProfile);
  }, [selectedId]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setOpenAdd(false);
      form.reset();
      const res = await fetch("/api/admin/doctors");
      const data = (await res.json()) as { items?: DoctorItem[] };
      setItems(data.items ?? []);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        role="admin"
        title="Doctors"
        description="Manage medical staff, biometric enrollment, and patient load."
      >
        <Button variant="info" onClick={() => setOpenAdd(true)}>
          Add doctor
        </Button>
      </PageHeader>

      <Card className="relative overflow-hidden">
        <LoadingOverlay show={loading} label="Loading doctors…" />
        <CardHeader>
          <CardTitle>Doctor Management Panel</CardTitle>
          <CardDescription>Verified status, patient load, and activity monitoring.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Biometric Status</TableHead>
                  <TableHead>Patients count</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.name}</TableCell>
                    <TableCell>{doctor.email}</TableCell>
                    <TableCell>
                      {(() => {
                        const badge = biometricStatusBadge(
                          resolveBiometricStatus({ enrolled: doctor.enrolled, verified: doctor.verified })
                        );
                        return <Badge variant={badge.variant}>{badge.label}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell>{doctor.patientsCount}</TableCell>
                    <TableCell>
                      {doctor.lastActivity ? new Date(doctor.lastActivity).toLocaleString() : "No activity"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(doctor.id)}>
                        View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Doctor</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Name" {...form.register("name")} />
            <Input placeholder="Email" type="email" {...form.register("email")} />
            <Input placeholder="Username" {...form.register("username")} />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpenAdd(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success" loading={submitting}>
                Create doctor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Doctor Profile View</DialogTitle>
          </DialogHeader>
          {!profile ? (
            <TableSkeleton rows={3} cols={2} />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-semibold">Assigned patients</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {profile.assignedPatients?.length ? profile.assignedPatients.map((p) => <li key={`${p.id}-${p.grantedAt}`}>{p.name} - {p.email}</li>) : <li>No assigned patients</li>}
                </ul>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-semibold">Access logs</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {profile.accessLogs?.length ? profile.accessLogs.slice(0, 6).map((l) => <li key={l.id}>{l.action} - {new Date(l.timestamp).toLocaleString()}</li>) : <li>No access logs</li>}
                </ul>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-semibold">Activity timeline</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {profile.timeline?.length ? profile.timeline.slice(0, 6).map((t, idx: number) => <li key={`${t.action}-${idx}`}>{t.action} - {new Date(t.at).toLocaleString()}</li>) : <li>No timeline data</li>}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
