"use client";

import * as React from "react";
import { Suspense, useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, FingerprintPattern as Fingerprint, Eye, Scan } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function BiometricContent() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [verificationSteps, setVerificationSteps] = useState({
    face: false,
    iris: false,
    fingerprint: false,
  });
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<"face" | "iris" | "fingerprint" | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = (type: "face" | "iris" | "fingerprint") => {
    setError(null);
    setActiveType(type);
    setDialogOpen(true);
  };

  const uploadAndVerify = async (files: FileList | null) => {
    if (!activeType) return;
    if (!userId) {
      setError("Missing userId");
      return;
    }
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("biometricType", activeType);
    Array.from(files).forEach((f) => fd.append("files", f, f.name));

    try {
      const res = await fetch("/api/biometric/verify-upload", { method: "POST", body: fd });
      const data = (await res.json()) as { verified?: boolean; error?: string };
      if (!res.ok) {
        setError(data?.error ?? "Verification failed");
        return;
      }
      if (data.verified) {
        setVerificationSteps((prev) => ({ ...prev, [activeType]: true }));
        setDialogOpen(false);
      } else {
        setError("Not a match. Please try again with clearer samples.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (verificationSteps.face && verificationSteps.iris && verificationSteps.fingerprint) {
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    }
  }, [verificationSteps, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Activity className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("biometricVerification")}</CardTitle>
          <CardDescription>Complete all biometric verifications to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Scan className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{t("verifyFace")}</p>
                  <p className="text-sm text-muted-foreground">Face Recognition</p>
                </div>
              </div>
              {verificationSteps.face ? (
                <span className="text-green-600 font-medium">✓ Verified</span>
              ) : (
                <Button
                  onClick={() => openPicker("face")}
                  disabled={loading}
                  size="sm"
                >
                  Verify
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{t("verifyIris")}</p>
                  <p className="text-sm text-muted-foreground">Iris Scan</p>
                </div>
              </div>
              {verificationSteps.iris ? (
                <span className="text-green-600 font-medium">✓ Verified</span>
              ) : (
                <Button
                  onClick={() => openPicker("iris")}
                  disabled={loading || !verificationSteps.face}
                  size="sm"
                >
                  Verify
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Fingerprint className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{t("verifyFingerprint")}</p>
                  <p className="text-sm text-muted-foreground">Fingerprint Scan</p>
                </div>
              </div>
              {verificationSteps.fingerprint ? (
                <span className="text-green-600 font-medium">✓ Verified</span>
              ) : (
                <Button
                  onClick={() => openPicker("fingerprint")}
                  disabled={loading || !verificationSteps.iris}
                  size="sm"
                >
                  Verify
                </Button>
              )}
            </div>
          </div>

          {verificationSteps.face && verificationSteps.iris && verificationSteps.fingerprint && (
            <div className="p-4 text-center text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md">
              All verifications complete! Redirecting...
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload biometric sample</DialogTitle>
            <DialogDescription>
              Choose one or more files, or select a folder, to scan & verify your{" "}
              <span className="font-medium">{activeType ?? "biometric"}</span>.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void uploadAndVerify(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-expect-error - non-standard but widely supported (Chromium/Edge)
              webkitdirectory=""
              className="hidden"
              onChange={(e) => void uploadAndVerify(e.target.files)}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                type="button"
                variant="default"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                Choose file(s)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => folderInputRef.current?.click()}
                className="w-full"
              >
                Choose folder
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={loading} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BiometricPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
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
