"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Link2, X } from "lucide-react";
import { greenButtonClass } from "@/lib/control-styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  resolveAccessGrantSchema,
  type ResolveAccessGrantInput,
} from "@/lib/doctor-schemas";

export type PendingGrantRow = {
  id: string;
  patientName: string;
  patientEmail: string;
  createdAt: string;
};

export function ResolveAccessDialog({
  grant,
  open,
  onOpenChange,
}: {
  grant: PendingGrantRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"otp" | "magic_link">("otp");

  const form = useForm<ResolveAccessGrantInput>({
    resolver: zodResolver(resolveAccessGrantSchema),
    defaultValues: { method: "otp", otp: "", magicLink: "" },
  });

  const submitting = form.formState.isSubmitting;

  const resetAndClose = () => {
    form.reset({ method: "otp", otp: "", magicLink: "" });
    setError(null);
    onOpenChange(false);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!grant) return;
    setError(null);
    const payload =
      values.method === "otp"
        ? { method: "otp" as const, otp: values.otp }
        : { method: "magic_link" as const, magicLink: values.magicLink };

    const res = await fetch(`/api/access-grants/${grant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string | { message?: string }[] };

    if (!res.ok) {
      const msg =
        typeof data.error === "string"
          ? data.error
          : Array.isArray(data.error)
            ? data.error[0]?.message ?? "Could not resolve request"
            : "Could not resolve request";
      setError(msg);
      return;
    }

    resetAndClose();
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve access request</DialogTitle>
          <DialogDescription>
            Confirm access for{" "}
            <span className="font-medium text-foreground">
              {grant?.patientName}
            </span>{" "}
            using the OTP or magic link the patient shared with you.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            const method = v as "otp" | "magic_link";
            setTab(method);
            form.setValue("method", method);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="otp" className="gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              OTP
            </TabsTrigger>
            <TabsTrigger value="magic_link" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Magic link
            </TabsTrigger>
          </TabsList>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <TabsContent value="otp" className="mt-0 space-y-2">
              <Label htmlFor="grant-otp">Patient OTP</Label>
              <Input
                id="grant-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                {...form.register("otp")}
              />
              {form.formState.errors.otp ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.otp.message}
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="magic_link" className="mt-0 space-y-2">
              <Label htmlFor="grant-magic">Magic link or token</Label>
              <Input
                id="grant-magic"
                placeholder="/auth/verify-grant?token=… or paste token"
                {...form.register("magicLink")}
              />
              <p className="text-xs text-muted-foreground">
                Full verify path is not configured yet — paste the token value
                from the patient.
              </p>
              {form.formState.errors.magicLink ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.magicLink.message}
                </p>
              ) : null}
            </TabsContent>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                onClick={resetAndClose}
                className=" transition-transform duration-200 bg-red-500 text-white hover:bg-red-500/80 cursor-pointer gap-2"
              >
                <X className="size-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                loading={submitting}
                className={`${greenButtonClass} border border-green-700`}
              >
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
