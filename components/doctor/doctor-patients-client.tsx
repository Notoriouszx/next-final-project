"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Pill, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingOverlay, ProgressBar } from "@/components/ui/loading";
import { PrescriptionDialog } from "@/components/doctor/prescription-dialog";
import { blueButtonClass, greenButtonClass, normalButtonClass } from "@/lib/control-styles";

export type ActivePatientRow = {
  grantId: string;
  patientId: string;
  name: string;
  email: string;
  grantedAt: string;
  expiresAt: string;
};

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;

function validateMedicalFiles(files: FileList): string | null {
  for (const file of Array.from(files)) {
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return `${file.name} is not supported. Use PDF, JPG, or PNG.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large. Maximum size is 15MB.`;
    }
  }
  return null;
}

export function DoctorPatientsClient({ patients }: { patients: ActivePatientRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadPatientId, setUploadPatientId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [rxPatient, setRxPatient] = useState<ActivePatientRow | null>(null);

  const triggerUpload = (patientId: string) => {
    setUploadPatientId(patientId);
    setError(null);
    fileRef.current?.click();
  };

  const onFilesPicked = async (files: FileList | null) => {
    if (!uploadPatientId || !files?.length) return;
    const validationError = validateMedicalFiles(files);
    if (validationError) {
      setError(validationError);
      setUploadPatientId(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    const fd = new FormData();
    fd.set("patientId", uploadPatientId);
    for (let i = 0; i < files.length; i++) {
      fd.append("files", files[i]);
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/doctor/medical-records");
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try {
              const j = JSON.parse(xhr.responseText) as { error?: string };
              reject(new Error(j.error ?? "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(fd);
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadPatientId(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const markResolved = async (grantId: string) => {
    setResolvingId(grantId);
    setError(null);
    try {
      const res = await fetch(`/api/access-grants/${grantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_care" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not complete care");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        role="doctor"
        title="My patients"
        description="Active patients who granted you access — manage records and care."
      />

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,image/jpeg,image/png,image/jpg,application/pdf"
        multiple
        onChange={(e) => void onFilesPicked(e.target.files)}
      />

      <Card className="relative overflow-hidden">
        <LoadingOverlay show={uploading} label="Uploading to patient record…" />
        <CardHeader>
          <CardTitle>Active access</CardTitle>
          <CardDescription>{patients.length} patients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploading ? (
            <div className="space-y-2">
              <ProgressBar value={progress > 0 ? progress : undefined} indeterminate={progress === 0} />
              <p className="text-xs text-muted-foreground">
                {progress > 0 ? `${progress}%` : "Starting upload…"}
              </p>
            </div>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active patients yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => (
                    <TableRow key={p.grantId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-sm font-semibold text-white">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <Badge variant="success" className="mt-0.5">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                      <TableCell className="text-sm">
                        <p className="mt-1 w-fit rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">Since {new Date(p.grantedAt).toLocaleDateString()}</p>
                        <p className="mt-1 w-fit rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Until {new Date(p.expiresAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className={`gap-1 ${normalButtonClass}`}
                            onClick={() => setRxPatient(p)}
                          >
                            <Pill className="h-3.5 w-3.5" />
                            Write prescription
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`gap-1 ${greenButtonClass}`}
                            disabled={uploading}
                            onClick={() => triggerUpload(p.patientId)}
                          >
                            <FileUp className="h-3.5 w-3.5" />
                            Add to record
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`gap-1 ${blueButtonClass}`}
                            loading={resolvingId === p.grantId}
                            onClick={() => void markResolved(p.grantId)}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Mark as resolved
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PrescriptionDialog
        open={Boolean(rxPatient)}
        onOpenChange={(o) => !o && setRxPatient(null)}
        patientName={rxPatient?.name ?? ""}
        patientId={rxPatient?.patientId ?? ""}
      />
    </div>
  );
}
