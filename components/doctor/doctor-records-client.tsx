"use client";

import { useMemo, useState } from "react";
import { Eye, FileText, Search } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
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
import { doctorRecordsFilterSchema } from "@/lib/doctor-schemas";
import { normalButtonClass } from "@/lib/control-styles";

export type DoctorRecordRow = {
  id: string;
  patientName: string;
  fileName: string | null;
  fileType: string | null;
  fileUrl: string;
  createdAt: string;
};

export function DoctorRecordsClient({ records }: { records: DoctorRecordRow[] }) {
  const [q, setQ] = useState("");
  const [fileType, setFileType] = useState<"all" | "pdf" | "image">("all");

  const filtered = useMemo(() => {
    const parsed = doctorRecordsFilterSchema.safeParse({ q: q || undefined, fileType });
    const filter = parsed.success ? parsed.data : { fileType: "all" as const, q: undefined };
    const needle = filter.q?.toLowerCase() ?? "";

    return records.filter((r) => {
      if (filter.fileType === "pdf" && r.fileType !== "application/pdf") return false;
      if (
        filter.fileType === "image" &&
        r.fileType &&
        !r.fileType.startsWith("image/")
      ) {
        return false;
      }
      if (!needle) return true;
      const hay = `${r.patientName} ${r.fileName ?? ""} ${r.fileType ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [records, q, fileType]);

  return (
    <div className="space-y-6">
      <PageHeader
        role="doctor"
        title="Medical records"
        description="Documents for patients under your active or completed care."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Records
            </CardTitle>
            <CardDescription>
              {filtered.length} of {records.length} files
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:min-w-[200px]">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="ps-9"
                placeholder="Search patient or file…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select
              value={fileType}
              onValueChange={(v) => {
                const t = z.enum(["all", "pdf", "image"]).safeParse(v);
                if (t.success) setFileType(t.data);
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Images</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records match your filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.patientName}</TableCell>
                      <TableCell>{r.fileName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {r.fileType?.split("/").pop() ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className={normalButtonClass} asChild>
                          <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
