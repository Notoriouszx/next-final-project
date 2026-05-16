"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roleBadgeVariant } from "@/lib/role-badge";

type Row = {
  id: string;
  action: string;
  status: string;
  category: string;
  timestamp: string;
  ipAddress: string;
  user: { id: string; name: string; email: string; role: string } | null;
};

function categoryColor(cat: string) {
  switch (cat) {
    case "CREATE":
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "DELETE":
      return "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";
    case "SECURITY":
      return "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200";
    default:
      return "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200";
  }
}

export function AdminAuditLogsPage() {
  const [tab, setTab] = useState<"table" | "timeline">("table");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [role, setRole] = useState("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "15",
      search,
      action,
      role,
      category,
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/admin/audit-logs?${params}`);
    const data = (await res.json()) as {
      items?: Row[];
      totalPages?: number;
    };
    setItems(data.items ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, search, action, role, category, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const timelineCopy = useMemo(
    () =>
      items.map((r) => {
        const who = r.user?.name ?? "System";
        const roleLabel = r.user?.role ?? "—";
        let line = `${who} (${roleLabel}) — ${r.action}`;
        if (r.action.includes("upload")) {
          line = `${who} uploaded a record`;
        } else if (r.action.includes("access_grant")) {
          line = `Access event: ${r.action.replace(/_/g, " ")}`;
        }
        return { ...r, line };
      }),
    [items]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
        <p className="text-muted-foreground">Vercel-style observability for compliance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search, scope by role, category, and date</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder="Search action or user"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Input
            placeholder="Action contains…"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground dark:bg-background"
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
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground dark:bg-background"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All categories</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="SECURITY">SECURITY</option>
          </select>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.action}</TableCell>
                        <TableCell>{r.user?.name ?? "—"}</TableCell>
                        <TableCell>
                          {r.user ? (
                            <Badge variant={roleBadgeVariant(r.user.role)} className="capitalize">
                              {r.user.role}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === "success" ? "success" : "destructive"}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{r.ipAddress}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(r.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4 flex items-center justify-between">
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
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="space-y-0 pt-6">
              {timelineCopy.map((r, idx) => (
                <div key={r.id} className="relative flex gap-4 pb-8 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-3 w-3 shrink-0 rounded-full border-2 border-background shadow ${
                        r.category === "CREATE"
                          ? "bg-emerald-500"
                          : r.category === "DELETE"
                            ? "bg-red-500"
                            : r.category === "SECURITY"
                              ? "bg-violet-500"
                              : "bg-sky-500"
                      }`}
                    />
                    {idx < timelineCopy.length - 1 ? (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${categoryColor(r.category)}`}
                      >
                        {r.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-snug">{r.line}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
