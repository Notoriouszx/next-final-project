import { z } from "zod";

export const resolveGrantMethodSchema = z.enum(["otp", "magic_link"]);

export const resolveAccessGrantSchema = z
  .object({
    method: resolveGrantMethodSchema,
    otp: z.string().optional(),
    magicLink: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "otp") {
      const code = data.otp?.trim() ?? "";
      if (code.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the OTP code from the patient",
          path: ["otp"],
        });
      }
    }
    if (data.method === "magic_link") {
      const link = data.magicLink?.trim() ?? "";
      if (link.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Paste the magic link or token from the patient",
          path: ["magicLink"],
        });
      }
    }
  });

export const prescriptionDraftSchema = z.object({
  patientId: z.string().min(1),
  notes: z.string().max(2000).optional(),
  medication: z.string().max(500).optional(),
});

export const doctorRecordUploadSchema = z.object({
  patientId: z.string().min(1),
  description: z.string().max(500).optional(),
});

export const doctorRecordsFilterSchema = z.object({
  q: z.string().max(120).optional(),
  fileType: z.enum(["all", "pdf", "image"]).default("all"),
});

export type ResolveAccessGrantInput = z.infer<typeof resolveAccessGrantSchema>;
export type DoctorRecordsFilter = z.infer<typeof doctorRecordsFilterSchema>;
