import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MEDICAL_RECORD_ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

export async function persistMedicalRecordFile(
  patientId: string,
  file: File
): Promise<{ fileUrl: string; fileType: string; fileSize: number }> {
  const fileType = file.type || "application/octet-stream";
  const fileSize = file.size;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(
      `records/${patientId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      file,
      { access: "public", addRandomSuffix: true }
    );
    return { fileUrl: blob.url, fileType, fileSize };
  }

  if (process.env.NODE_ENV === "development") {
    const dir = path.join(process.cwd(), "public", "uploads", patientId);
    await mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fp = path.join(dir, safeName);
    await writeFile(fp, buffer);
    return {
      fileUrl: `/uploads/${patientId}/${safeName}`,
      fileType,
      fileSize,
    };
  }

  throw new Error("BLOB_READ_WRITE_TOKEN is required for file uploads in production");
}
