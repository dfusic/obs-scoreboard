import { fileToResizedDataUrl } from "@shared/image";

/** Player name from a photo's file name: "ivan_horvat-final.png" -> "Ivan Horvat Final". */
export function nameFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)\p{Ll}/gu, (c) => c.toUpperCase());
}

export interface ImageKind {
  maxDimension: number;
  format: "image/png" | "image/jpeg";
}

/** Logos and player photos keep transparency (PNG cut-outs); backgrounds are JPEG. */
export const LOGO_IMAGE: ImageKind = { maxDimension: 600, format: "image/png" };
/** Sponsor logos: PNG like team logos, larger since one at a time fills half the screen. */
export const SPONSOR_LOGO_IMAGE: ImageKind = { maxDimension: 800, format: "image/png" };
export const PHOTO_IMAGE: ImageKind = { maxDimension: 800, format: "image/png" };
export const BACKGROUND_IMAGE: ImageKind = { maxDimension: 1920, format: "image/jpeg" };

/** Each image shares a Firestore doc (1 MiB limit) with a few small fields. */
const MAX_DATA_URL_LENGTH = 900_000;

/** Resizes an image for storage, scaling down further until it fits in a doc. */
export async function processImage(file: File, kind: ImageKind): Promise<string> {
  let dimension = kind.maxDimension;
  for (;;) {
    const dataUrl = await fileToResizedDataUrl(file, dimension, kind.format);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
    if (dimension < 200) throw new Error("Image is too detailed to store. Try a simpler or smaller image.");
    dimension = Math.round(dimension * 0.8);
  }
}
