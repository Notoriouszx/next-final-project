"use client";

import { Suspense, useRef, useState, useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, FingerprintPattern as Fingerprint, Eye, Scan, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Modality = "face" | "iris" | "fingerprint";
type StepStatus = "idle" | "pending" | "verified";

function BiometricContent() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [stepStatus, setStepStatus] = useState<Record<Modality, StepStatus>>({
    face: "idle",
    iris: "idle",
    fingerprint: "idle",
  });
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<Modality, File>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeType, setActiveType] = useState<Modality | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allPending =
    stepStatus.face === "pending" &&
    stepStatus.iris === "pending" &&
    stepStatus.fingerprint === "pending";

  const allVerified =
    stepStatus.face === "verified" &&
    stepStatus.iris === "verified" &&
    stepStatus.fingerprint === "verified";

  const openPicker = (type: Modality) => {
    if (stepStatus[type] === "verified") return;
    setError(null);
    setActiveType(type);
    fileInputRef.current?.click();
  };

  const onFileSelected = (files: FileList | null) => {
    if (!activeType || !files?.length) return;
    const file = files[0];
    const maxBytes = 8 * 1024 * 1024;
    const minBytes = 4 * 1024;
    if (file.size < minBytes) {
      setError("Image is too small — use a higher-resolution capture.");
      return;
    }
    if (file.size > maxBytes) {
      setError("Image must be 8 MB or smaller.");
      return;
    }
    if (file.type && !/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setError("Only JPEG, PNG, or WebP images are accepted.");
      return;
    }
    setPendingFiles((prev) => ({ ...prev, [activeType]: file }));
    setStepStatus((prev) => ({ ...prev, [activeType]: "pending" }));
    setActiveType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitAll = async () => {
    if (!userId) {
      setError("Missing userId");
      return;
    }
    const face = pendingFiles.face;
    const iris = pendingFiles.iris;
    const fingerprint = pendingFiles.fingerprint;
    if (!face || !iris || !fingerprint) {
      setError("Upload face, iris, and fingerprint images before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("face", face, face.name);
    fd.set("iris", iris, iris.name);
    fd.set("fingerprint", fingerprint, fingerprint.name);

    try {
      const res = await fetch("/api/biometric/verify-upload", { method: "POST", body: fd });
      const data = (await res.json()) as { verified?: boolean; error?: string };
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : res.status === 422
              ? "Image quality too low — use clearer, well-lit photos."
              : "Verification failed"
        );
        return;
      }
      if (data.verified) {
        setStepStatus({ face: "verified", iris: "verified", fingerprint: "verified" });
      } else {
        setError("Not a match. Ensure admin enrolled your credentials and try clearer samples.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (allVerified) {
      const id = setTimeout(() => router.push("/dashboard"), 1200);
      return () => clearTimeout(id);
    }
  }, [allVerified, router]);

  const rows: { type: Modality; icon: ReactNode; title: string; subtitle: string }[] = [
    { type: "face", icon: <Scan className="h-8 w-8 text-primary" />, title: t("verifyFace"), subtitle: "Face Recognition" },
    { type: "iris", icon: <Eye className="h-8 w-8 text-primary" />, title: t("verifyIris"), subtitle: "Iris Scan" },
    {
      type: "fingerprint",
      icon: <Fingerprint className="h-8 w-8 text-primary" />,
      title: t("verifyFingerprint"),
      subtitle: "Fingerprint Scan",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <Activity className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("biometricVerification")}</CardTitle>
          <CardDescription>
            Upload face, iris, and fingerprint samples, then submit for verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files)}
          />

          <div className="space-y-3">
            {rows.map(({ type, icon, title, subtitle }) => {
              const status = stepStatus[type];
              const file = pendingFiles[type];
              return (
                <div key={type} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    {icon}
                    <div className="min-w-0">
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{subtitle}</p>
                      {status === "pending" && file ? (
                        <p className="mt-1 truncate text-xs text-amber-600 dark:text-amber-400">
                          Pending: {file.name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {status === "verified" ? (
                      <span className="font-medium text-green-600">✓ Verified</span>
                    ) : status === "pending" ? (
                      <>
                        <Badge variant="secondary">Pending</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={submitting}
                          onClick={() => openPicker(type)}
                        >
                          Change
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" disabled={submitting} onClick={() => openPicker(type)}>
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {allPending && !allVerified ? (
            <Button className="w-full" disabled={submitting} onClick={() => void submitAll()}>
              {submitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Submit all biometrics"
              )}
            </Button>
          ) : null}

          {allVerified ? (
            <div className="rounded-md bg-green-50 p-4 text-center text-green-600 dark:bg-green-900/20">
              All verifications complete! Redirecting…
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BiometricPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
          <Card className="w-full max-w-lg">
            <CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent>
          </Card>
        </div>
      }
    >
      <BiometricContent />
    </Suspense>
  );
}
