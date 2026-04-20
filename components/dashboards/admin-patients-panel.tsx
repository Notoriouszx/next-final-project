"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PatientItem = {
  id: string;
  name: string;
  email: string;
  recordsCount: number;
  lastUpload: string | null;
  accessGrantedCount: number;
};
type PatientProfile = {
  records: Array<{ id: string; fileName: string | null; createdAt: string }>;
  access: Array<{
    id: string;
    status: string;
    doctor: { name: string } | null;
    nurse: { name: string } | null;
  }>;
  security: { twoFactorEnabled: boolean; biometricsEnabled: boolean };
};

export function AdminPatientsPanel() {
  const [items, setItems] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [generated, setGenerated] = useState<{ otp?: string; magicLinkPath?: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/patients");
      const data = (await res.json()) as { items?: PatientItem[] };
      setItems(data.items ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/admin/patients/${selectedId}`)
      .then((r) => r.json())
      .then(setProfile);
  }, [selectedId]);

  const revokeAccess = async (grantId: string) => {
    if (!selectedId) return;
    await fetch(`/api/admin/patients/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", grantId }),
    });
    const refreshed = await fetch(`/api/admin/patients/${selectedId}`);
    setProfile(await refreshed.json());
  };

  const generateOtp = async () => {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/patients/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate-otp" }),
    });
    setGenerated(await res.json());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
        <p className="text-muted-foreground">Core patient management with security-first controls.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patients Table</CardTitle>
          <CardDescription>Records, access grants, and security visibility.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Records count</TableHead>
                  <TableHead>Last upload</TableHead>
                  <TableHead>Access granted count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.recordsCount}</TableCell>
                    <TableCell>{patient.lastUpload ? new Date(patient.lastUpload).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{patient.accessGrantedCount}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(patient.id)}>
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

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Patient Profile Page</DialogTitle>
          </DialogHeader>
          {!profile ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-semibold">Uploaded records</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {profile.records?.length ? profile.records.slice(0, 8).map((record) => <li key={record.id}>{record.fileName ?? "Record"} - {new Date(record.createdAt).toLocaleString()}</li>) : <li>No records uploaded</li>}
                </ul>
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-semibold">Who has access</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {profile.access?.length ? profile.access.map((grant) => (
                    <li key={grant.id} className="flex items-center justify-between gap-2">
                      <span>
                        {grant.doctor?.name ?? grant.nurse?.name ?? "Unassigned"} - {grant.status}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => revokeAccess(grant.id)}>
                        Revoke access
                      </Button>
                    </li>
                  )) : <li>No access grants</li>}
                </ul>
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-semibold">Security settings</p>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={profile.security?.twoFactorEnabled ? "success" : "warning"}>
                    2FA: {profile.security?.twoFactorEnabled ? "enabled" : "disabled"}
                  </Badge>
                  <Badge variant={profile.security?.biometricsEnabled ? "success" : "warning"}>
                    Biometrics: {profile.security?.biometricsEnabled ? "enabled" : "disabled"}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={generateOtp}>
                    Generate OTP / magic link
                  </Button>
                </div>
                {generated ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    OTP: {generated.otp} | Link: {generated.magicLinkPath}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
