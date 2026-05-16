import sharp from "sharp";

export type BiometricModality = "face" | "iris" | "fingerprint";

const EMBEDDING_DIM = 512;

function decodeDataUrl(dataUrl: string): Buffer {
  const raw = dataUrl.includes(",") ? dataUrl.split(",", 2)[1]! : dataUrl;
  return Buffer.from(raw, "base64");
}

/** Stable seed (Python hash() is not portable across processes). */
function modalitySeed(modality: string): number {
  let h = 0;
  for (let i = 0; i < modality.length; i++) {
    h = (Math.imul(31, h) + modality.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededNormal(rng: () => number, dim: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < dim; i++) {
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    out.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
  }
  return out;
}

function normalize(vec: number[]): number[] {
  const n = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) + 1e-8;
  return vec.map((x) => x / n);
}

export async function extractEmbeddingFromDataUrl(
  dataUrl: string,
  modality: BiometricModality
): Promise<number[] | null> {
  try {
    const buffer = decodeDataUrl(dataUrl);
    const small = await sharp(buffer).resize(224, 224).grayscale().resize(32, 32).raw().toBuffer();

    let feats = Array.from(small, (v) => Number(v));
    const dim = EMBEDDING_DIM;
    if (feats.length < dim) {
      feats = [...feats, ...Array(dim - feats.length).fill(0)];
    } else {
      feats = feats.slice(0, dim);
    }

    feats = normalize(feats);
    const rng = mulberry32(modalitySeed(modality));
    const mix = seededNormal(rng, dim).map((x) => x * 0.05);
    return normalize(feats.map((x, i) => x + mix[i]!));
  } catch {
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let n1 = 0;
  let n2 = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    n1 += a[i]! * a[i]!;
    n2 += b[i]! * b[i]!;
  }
  if (n1 === 0 || n2 === 0) return 0;
  const cosine = dot / (Math.sqrt(n1) * Math.sqrt(n2));
  return (cosine + 1) / 2;
}
