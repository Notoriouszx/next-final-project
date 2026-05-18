export const BIOMETRIC_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const BIOMETRIC_MIN_FILE_BYTES = 4 * 1024;
export const BIOMETRIC_MIN_QUALITY_SCORE = 0.35;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type BiometricFileValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateBiometricUploadFile(file: File): BiometricFileValidationResult {
  if (!file.size) {
    return { ok: false, error: "Empty file" };
  }
  if (file.size < BIOMETRIC_MIN_FILE_BYTES) {
    return { ok: false, error: "Image file is too small — use a higher-resolution capture" };
  }
  if (file.size > BIOMETRIC_MAX_FILE_BYTES) {
    return { ok: false, error: "Image file exceeds 8 MB limit" };
  }
  const mime = (file.type || "").toLowerCase();
  if (mime && !ALLOWED_MIME.has(mime)) {
    return { ok: false, error: "Only JPEG, PNG, or WebP images are accepted" };
  }
  return { ok: true };
}

export function validateBiometricVerifyPayload(json: unknown): BiometricFileValidationResult {
  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : {};

  const checks = o.checks;
  if (checks && typeof checks === "object") {
    for (const [modality, entry] of Object.entries(checks as Record<string, unknown>)) {
      const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
      if (row?.rejected === true) {
        const reason =
          typeof row.reject_reason === "string"
            ? row.reject_reason
            : "Quality check failed";
        return { ok: false, error: `${modality}: ${reason}` };
      }
    }
  }

  const quality = typeof o.quality === "number" ? o.quality : null;
  if (quality !== null && quality < BIOMETRIC_MIN_QUALITY_SCORE) {
    return {
      ok: false,
      error: "Biometric capture quality too low — use a clearer, well-lit photo",
    };
  }

  return { ok: true };
}
