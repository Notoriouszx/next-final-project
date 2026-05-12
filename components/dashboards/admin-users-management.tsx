"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleBadgeVariant } from "@/lib/role-badge";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "nurse" | "patient";
  isActive: boolean;
  createdAt: string;
};

const formSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  role: z.enum(["admin", "doctor", "nurse", "patient"]),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function AdminUsersManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      role: "patient",
      isActive: true,
    },
  });
  const watchedRole = useWatch({ control: form.control, name: "role" });
  const watchedIsActive = useWatch({ control: form.control, name: "isActive" });

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
        search,
        role,
        status,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setLoading(false);
    };
    fetchUsers();
  }, [page, role, search, status]);

  const openEdit = (user: UserItem) => {
    setSelected(user);
    form.reset({
      id: user.id,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  };

  const onUpdate = form.handleSubmit(async (values) => {
    setSubmitting(true);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSelected(null);
    setSubmitting(false);
    setPage(1);
    const refresh = await fetch("/api/admin/users?page=1&pageSize=10");
    const data = await refresh.json();
    setUsers(data.items ?? []);
    setTotalPages(data.totalPages ?? 1);
  });

  const onDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    setSubmitting(false);
    const refresh = await fetch("/api/admin/users?page=1&pageSize=10");
    const data = await refresh.json();
    setUsers(data.items ?? []);
    setTotalPages(data.totalPages ?? 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
        <p className="text-muted-foreground">Search, filter, edit and deactivate platform users.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Production-ready CRUD table with RBAC-backed actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-9"
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="patient">Patient</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed text-center">
              <UserX className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs text-muted-foreground">Try changing your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(u.role)} className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "success" : "destructive"}>
                        {u.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(u)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update identity, role, and activation status.</DialogDescription>
          </DialogHeader>

          <form onSubmit={onUpdate} className="space-y-4">
            <Input type="hidden" {...form.register("id")} />
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={watchedRole}
                onValueChange={(v) => form.setValue("role", v as FormData["role"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <label className="text-sm font-medium">Active status</label>
              <Switch
                checked={watchedIsActive}
                onCheckedChange={(checked: boolean) => form.setValue("isActive", checked)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="success" disabled={submitting}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This performs a soft delete and sets the user status to inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={submitting} onClick={onDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
