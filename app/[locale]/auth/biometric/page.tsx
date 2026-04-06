"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, FingerprintPattern as Fingerprint, Eye, Scan } from "lucide-react";

export default function BiometricPage() {
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

  const simulateVerification = async (type: "face" | "iris" | "fingerprint") => {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockHash = `${type}_hash_${Date.now()}`;

    await fetch("/api/biometric/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        biometricType: type,
        biometricHash: mockHash,
        verified: true,
      }),
    });

    setVerificationSteps((prev) => ({ ...prev, [type]: true }));
    setLoading(false);
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
                  onClick={() => simulateVerification("face")}
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
                  onClick={() => simulateVerification("iris")}
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
                  onClick={() => simulateVerification("fingerprint")}
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
    </div>
  );
}
