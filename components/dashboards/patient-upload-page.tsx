"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PatientUploadPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      const form = e.currentTarget;
      const input = form.elements.namedItem("files") as HTMLInputElement;
      const files = input?.files;
      if (!files?.length) {
        setError("Choose at least one PDF or image.");
        return;
      }

      setBusy(true);
      setProgress(0);

      const fd = new FormData();
      if (description.trim()) {
        fd.append("description", description.trim());
      }
      for (let i = 0; i < files.length; i++) {
        fd.append("files", files[i]);
      }

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/medical-records");
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              setProgress(Math.round((evt.loaded / evt.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
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
        form.reset();
        setDescription("");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy(false);
        setProgress(0);
      }
    },
    [description, router]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload record</h1>
        <p className="text-muted-foreground">PDF, JPG, or PNG — multiple files supported</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Files
          </CardTitle>
          <CardDescription>
            Production: configure <code className="rounded bg-muted px-1">BLOB_READ_WRITE_TOKEN</code>{" "}
            on Vercel. Local dev saves under <code className="rounded bg-muted px-1">public/uploads</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Lab results 2026"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Files</label>
              <Input
                name="files"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/jpg,application/pdf"
                multiple
                disabled={busy}
              />
            </div>
            {progress > 0 && busy ? (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{progress}%</p>
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
