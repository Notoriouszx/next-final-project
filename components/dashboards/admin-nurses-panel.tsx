"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const addNurseSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(3),
});
type NurseItem = {
  id: string;
  name: string;
  email: string;
  assignedDoctors: number;
  isActive: boolean;
  lastActivity: string | null;
};
type NurseProfile = {
  assignedDoctors: Array<{ id: string; name: string; email: string }>;
  activity: Array<{ id: string; action: string; timestamp: string }>;
};

export function AdminNursesPanel() {
  const [items, setItems] = useState<NurseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<NurseProfile | null>(null);

  const form = useForm<z.infer<typeof addNurseSchema>>({
    resolver: zodResolver(addNurseSchema),
    defaultValues: { name: "", email: "", username: "" },
  });

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/nurses");
      const data = (await res.json()) as { items?: NurseItem[] };
      setItems(data.items ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/admin/nurses/${selectedId}`)
      .then((r) => r.json())
      .then(setProfile);
  }, [selectedId]);

  const onSubmit = form.handleSubmit(async (values) => {
    await fetch("/api/admin/nurses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setOpenAdd(false);
    form.reset();
    const res = await fetch("/api/admin/nurses");
    const data = (await res.json()) as { items?: NurseItem[] };
    setItems(data.items ?? []);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nurses</h1>
          <p className="text-muted-foreground">Simplified staff management with activity tracking.</p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>Add Nurse</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nurse Management Panel</CardTitle>
          <CardDescription>Assigned doctors and last activity with scoped permissions.</CardDescription>
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
                  <TableHead>Assigned doctors</TableHead>
                  <TableHead>Activity status</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((nurse) => (
                  <TableRow key={nurse.id}>
                    <TableCell className="font-medium">{nurse.name}</TableCell>
                    <TableCell>{nurse.email}</TableCell>
                    <TableCell>{nurse.assignedDoctors}</TableCell>
                    <TableCell>
                      <Badge variant={nurse.isActive ? "success" : "destructive"}>
                        {nurse.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {nurse.lastActivity ? new Date(nurse.lastActivity).toLocaleString() : "No activity"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(nurse.id)}>
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
            <DialogTitle>Add Nurse</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Name" {...form.register("name")} />
            <Input placeholder="Email" type="email" {...form.register("email")} />
            <Input placeholder="Username" {...form.register("username")} />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpenAdd(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Nurse</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nurse Profile View</DialogTitle>
          </DialogHeader>
          {!profile ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-semibold">Assigned doctors</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {profile.assignedDoctors?.length ? profile.assignedDoctors.map((d) => <li key={d.id}>{d.name} - {d.email}</li>) : <li>No assigned doctors</li>}
                </ul>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-semibold">Activity tracking</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {profile.activity?.length ? profile.activity.slice(0, 6).map((a) => <li key={a.id}>{a.action} - {new Date(a.timestamp).toLocaleString()}</li>) : <li>No activity logs</li>}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
