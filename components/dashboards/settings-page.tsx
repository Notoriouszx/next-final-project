"use client";

import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-switcher";

const MAINT_KEY = "ehc_maintenance_mode";

export function SettingsPage({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [appName, setAppName] = useState("MediCare");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState("");
  const [twoFa, setTwoFa] = useState(user.two_factor_enabled);
  const [sessionMins, setSessionMins] = useState(60);
  const [maintenance, setMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("ehc_app_name") : null;
    if (stored) setAppName(stored);
    if (typeof window !== "undefined") {
      setMaintenance(localStorage.getItem(MAINT_KEY) === "1");
    }
    void (async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) return;
      const data = (await res.json()) as {
        name: string;
        email: string;
        twoFactorEnabled: boolean;
      };
      setName(data.name);
      setEmail(data.email);
      setTwoFa(data.twoFactorEnabled);
    })();
  }, []);

  const saveGeneral = () => {
    localStorage.setItem("ehc_app_name", appName);
  };

  const saveAccount = async () => {
    setSaving(true);
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
  };

  const toggleMaintenance = (v: boolean) => {
    setMaintenance(v);
    localStorage.setItem(MAINT_KEY, v ? "1" : "0");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Preferences and account controls</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Workspace labels and locale</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>App name (local)</Label>
            <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Locale</Label>
            <div className="pt-1">
              <LanguageSwitcher />
            </div>
          </div>
          <Button variant="success" type="button" onClick={saveGeneral}>
            Save general
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Session and authentication (mock toggles where noted)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">
                Reflects server state — use Security / 2FA flow to change for real
              </p>
            </div>
            <Switch checked={twoFa} disabled aria-readonly />
          </div>
          <div className="space-y-1">
            <Label>Session timeout (minutes, mock)</Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={sessionMins}
              onChange={(e) => setSessionMins(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} readOnly className="bg-muted" />
          </div>
          <Button variant="success" type="button" disabled={saving} onClick={() => void saveAccount()}>
            Save changes
          </Button>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
            <CardDescription>Administrator controls (mock)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Maintenance mode</p>
                <p className="text-xs text-muted-foreground">Stored in localStorage for demo only</p>
              </div>
              <Switch checked={maintenance} onCheckedChange={toggleMaintenance} />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
