"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GooeyInput } from "@/components/ui/gooey-input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { greenButtonClass, normalButtonClass } from "@/lib/control-styles";

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
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const credentialsInputRef = useRef<HTMLInputElement | null>(null);

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
    setEnrollMessage(null);
    setEnrollError(null);
    form.reset({
      id: user.id,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  };

  const onCredentialsSelected = async (files: FileList | null) => {
    if (!selected || !files?.length) return;
    setEnrolling(true);
    setEnrollMessage(null);
    setEnrollError(null);

    const fd = new FormData();
    fd.set("userId", selected.id);
    Array.from(files).forEach((file) => {
      const lower = file.name.toLowerCase();
      if (lower.includes("face")) fd.append("face", file, file.name);
      else if (lower.includes("iris") || lower.includes("eye")) fd.append("iris", file, file.name);
      else if (lower.includes("finger") || lower.includes("print"))
        fd.append("fingerprint", file, file.name);
      else fd.append("files", file, file.name);
    });

    try {
      const res = await fetch("/api/admin/biometric-enroll", {
        method: "POST",
        body: fd,
      });
      const raw = await res.text();
      let data: {
        success?: boolean;
        message?: string;
        modalities?: string[];
        error?: string;
      };
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setEnrollError(
          res.ok
            ? "Invalid response from server"
            : raw.slice(0, 120) || `Upload failed (${res.status})`
        );
        return;
      }
      if (!res.ok) {
        setEnrollError(data?.error ?? "Failed to upload biometric credentials");
        return;
      }
      setEnrollMessage(
        data.message ??
          `Credentials stored${data.modalities?.length ? ` (${data.modalities.join(", ")})` : ""}.`
      );
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : "Failed to upload biometric credentials");
    } finally {
      setEnrolling(false);
      if (credentialsInputRef.current) credentialsInputRef.current.value = "";
    }
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
            <div className="md:col-span-2">
              <GooeyInput
                placeholder="Search by name or email"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={normalButtonClass}
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(u)}>
                        Delete
                      </Button>
                      </div>
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={normalButtonClass}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={normalButtonClass}
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
            <div className="space-y-1">
              <label className="text-sm font-medium">Active status</label>
              <Select
                value={watchedIsActive ? "active" : "inactive"}
                onValueChange={(v) => form.setValue("isActive", v === "active")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(watchedRole === "doctor" || watchedRole === "nurse") && (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <p className="text-sm font-medium">Biometric credentials</p>
              <p className="text-xs text-muted-foreground">
                Upload reference images for this user (face, iris, fingerprint). Name files with
                face, iris, or finger so they map correctly.
              </p>
              <input
                ref={credentialsInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void onCredentialsSelected(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                className={normalButtonClass}
                disabled={enrolling || submitting}
                onClick={() => credentialsInputRef.current?.click()}
              >
                {enrolling ? "Uploading…" : "Upload credentials"}
              </Button>
              {enrollMessage ? <p className="text-xs text-green-600">{enrollMessage}</p> : null}
              {enrollError ? <p className="text-xs text-destructive">{enrollError}</p> : null}
            </div>
            )}

            <DialogFooter>
              <Button type="button" variant="destructive" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                className={greenButtonClass}
                disabled={submitting}
              >
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
              This permanently deletes the user and all of their biometric data, sessions, and role-specific
              access grants. Other patients&apos; records are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={() => setDeleteTarget(null)}>
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
