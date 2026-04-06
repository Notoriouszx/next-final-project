"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const callbackURL = `/${locale}/dashboard`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authClient.signIn.email({ email, password, callbackURL });
      if (res.error) {
        setError(res.error.message ?? "Login failed");
        return;
      }
      const data = res.data as { twoFactorRedirect?: boolean } | undefined;
      if (data?.twoFactorRedirect) {
        router.push("/auth/two-factor");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: err } = await authClient.signIn.magicLink({
        email,
        callbackURL,
      });
      if (err) {
        setError(err.message ?? "Could not send magic link");
        return;
      }
      setMagicSent(true);
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: err } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (err) {
        setError(err.message ?? "Could not send OTP");
        return;
      }
      setOtpSent(true);
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: err } = await authClient.signIn.emailOtp({
        email,
        otp,
        callbackURL,
      });
      if (err) {
        setError(err.message ?? "Invalid code");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-background to-indigo-50/80 p-4 dark:from-slate-950 dark:via-background dark:to-slate-900">
      <Card className="w-full max-w-md border-primary/10 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("login")}</CardTitle>
          <CardDescription>
            Sign in with password, magic link, or email OTP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="magic">Magic link</TabsTrigger>
              <TabsTrigger value="otp">OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-4 pt-2">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "…" : t("login")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="magic">
              <form onSubmit={handleMagicLink} className="space-y-4 pt-2">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {magicSent ? (
                  <p className="text-sm text-muted-foreground">
                    Check your inbox for a sign-in link. You can close this page.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="magic-email">{t("email")}</Label>
                      <Input
                        id="magic-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "…" : "Send magic link"}
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>

            <TabsContent value="otp">
              <div className="space-y-4 pt-2">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">{t("email")}</Label>
                    <Input
                      id="otp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                    {loading ? "…" : "Send OTP"}
                  </Button>
                </form>
                {otpSent && (
                  <form onSubmit={handleOtpSignIn} className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-code">{t("enterOTP")}</Label>
                      <Input
                        id="otp-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "…" : t("verifyOTP")}
                    </Button>
                  </form>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t("dontHaveAccount")} </span>
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              {t("register")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
