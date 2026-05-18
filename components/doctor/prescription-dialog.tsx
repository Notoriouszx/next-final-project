"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { prescriptionDraftSchema } from "@/lib/doctor-schemas";
import { z } from "zod";

type PrescriptionForm = z.infer<typeof prescriptionDraftSchema>;

export function PrescriptionDialog({
  open,
  onOpenChange,
  patientName,
  patientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  patientId: string;
}) {
  const form = useForm<PrescriptionForm>({
    resolver: zodResolver(prescriptionDraftSchema),
    defaultValues: { patientId, medication: "", notes: "" },
  });

  const onSubmit = form.handleSubmit(async () => {
    onOpenChange(false);
    form.reset({ patientId, medication: "", notes: "" });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write prescription</DialogTitle>
          <DialogDescription>
            Draft for <span className="font-medium text-foreground">{patientName}</span> — e-prescribing
            integration coming soon.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rx-medication">Medication</Label>
            <Input
              id="rx-medication"
              placeholder="e.g. Amoxicillin 500mg"
              {...form.register("medication")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rx-notes">Notes</Label>
            <Input id="rx-notes" placeholder="Dosage, duration, instructions…" {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="info">
              Save draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
