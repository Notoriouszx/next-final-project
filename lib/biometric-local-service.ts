import prisma from "@/lib/prisma";
import {
  extractEmbeddingFromDataUrl,
  cosineSimilarity,
  type BiometricModality,
} from "@/lib/biometric-embedding";

const VERIFICATION_THRESHOLD = 0.75;

type ImageFields = {
  face_image?: string | null;
  iris_image?: string | null;
  fingerprint_image?: string | null;
};

const FIELD_TO_MODALITY: Record<keyof ImageFields, BiometricModality> = {
  face_image: "face",
  iris_image: "iris",
  fingerprint_image: "fingerprint",
};

export async function extractEmbeddingsFromImages(
  images: ImageFields
): Promise<Record<BiometricModality, number[]>> {
  const out: Partial<Record<BiometricModality, number[]>> = {};
  for (const [field, modality] of Object.entries(FIELD_TO_MODALITY) as [
    keyof ImageFields,
    BiometricModality,
  ][]) {
    const dataUrl = images[field];
    if (!dataUrl?.trim()) continue;
    const emb = await extractEmbeddingFromDataUrl(dataUrl.trim(), modality);
    if (emb) out[modality] = emb;
  }
  return out as Record<BiometricModality, number[]>;
}

export async function enrollUserLocally(
  userId: string,
  images: ImageFields
): Promise<{ success: boolean; embeddings: Record<string, number[]>; message: string }> {
  const embeddings = await extractEmbeddingsFromImages(images);
  const keys = Object.keys(embeddings);
  if (keys.length === 0) {
    return {
      success: false,
      embeddings: {},
      message: "No valid biometric images could be processed.",
    };
  }
  return {
    success: true,
    embeddings: embeddings as Record<string, number[]>,
    message: `Enrolled ${keys.length} modality(ies) locally: ${keys.join(", ")}`,
  };
}

export async function verifyUserLocally(
  userId: string,
  images: ImageFields
): Promise<{ verified: boolean; confidence: number; scores: Record<string, number> }> {
  const stored = await prisma.biometricSample.findMany({
    where: { userId, isActive: true },
  });

  if (stored.length === 0) {
    return { verified: false, confidence: 0, scores: {} };
  }

  const templates = new Map<string, number[]>();
  for (const row of stored) {
    const emb = row.embedding as number[];
    if (Array.isArray(emb)) templates.set(row.modality, emb);
  }

  const probe = await extractEmbeddingsFromImages(images);
  const scores: Record<string, number> = {};
  let total = 0;

  for (const [modality, embedding] of Object.entries(probe)) {
    const template = templates.get(modality);
    if (!template) continue;
    const sim = cosineSimilarity(embedding, template);
    scores[modality] = sim;
    total += sim;
  }

  if (Object.keys(scores).length === 0) {
    return { verified: false, confidence: 0, scores: {} };
  }

  const confidence = total / Object.keys(scores).length;
  return {
    verified: confidence >= VERIFICATION_THRESHOLD,
    confidence,
    scores,
  };
}
