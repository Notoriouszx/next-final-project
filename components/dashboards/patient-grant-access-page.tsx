"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Key, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleBadgeVariant } from "@/lib/role-badge";

type Provider = {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "nurse";
  verified: boolean;
  lastActivity: string | null;
};

export function PatientGrantAccessPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | "doctor" | "nurse">("all");
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantResult, setGrantResult] = useState<{
    otp: string | null;
    magicLinkPath: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, role });
    const res = await fetch(`/api/patient/available-providers?${params}`);
    const data = (await res.json()) as { items?: Provider[] };
    setItems(data.items ?? []);
    setLoading(false);
  }, [search, role]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(t);
  }, [load]);

  const grant = async (p: Provider) => {
    setBusyId(p.id);
    setGrantResult(null);
    const body =
      p.role === "doctor" ? { doctorId: p.id, expiresInHours: 72 } : { nurseId: p.id, expiresInHours: 72 };
    const res = await fetch("/api/access-grants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      otp?: string;
      magicLinkPath?: string;
      error?: unknown;
    };
    setBusyId(null);
    if (!res.ok) {
      return;
    }
    setGrantResult({
      otp: data.otp ?? null,
      magicLinkPath: data.magicLinkPath ?? "",
    });
    router.refresh();
    void load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grant access</h1>
        <p className="text-muted-foreground">
          Invite doctors or nurses who do not yet have access to your records
        </p>
      </div>

      {grantResult ? (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4" />
              Access credentials
            </CardTitle>
            <CardDescription>Share securely with your provider (mock delivery).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {grantResult.otp ? (
              <p>
                <span className="font-medium">OTP:</span>{" "}
                <code className="rounded bg-background px-2 py-0.5">{grantResult.otp}</code>
              </p>
            ) : null}
            <p>
              <span className="font-medium">Magic link path:</span>{" "}
              <code className="break-all rounded bg-background px-2 py-0.5">
                {grantResult.magicLinkPath}
              </code>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Available providers</CardTitle>
          <CardDescription>Search and filter — only staff without an active grant are listed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="ps-9"
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="nurse">Nurses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No providers match your filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className="text-end">Grant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(p.role)} className="capitalize">
                        {p.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.verified ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.lastActivity ? new Date(p.lastActivity).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="sm"
                        disabled={busyId === p.id}
                        onClick={() => void grant(p)}
                      >
                        Grant
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
