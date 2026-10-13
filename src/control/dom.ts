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

/** Updates a form field from a snapshot, unless the operator is editing it. */
export function setFieldValue(field: HTMLInputElement | HTMLSelectElement, value: string): void {
  if (document.activeElement !== field && field.value !== value) field.value = value;
}

export const IMAGE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
export const UPLOAD_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

export interface ImageKind {
  maxDimension: number;
  format: "image/png" | "image/jpeg";
}

/** Logos and player photos keep transparency (PNG cut-outs); backgrounds are JPEG. */
export const LOGO_IMAGE: ImageKind = { maxDimension: 600, format: "image/png" };
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

/**
 * Wires a file input: resizes the chosen image and passes the data URL to `save`.
 * Progress and errors go to `status`.
 */
export function bindImageUpload(
  input: HTMLInputElement,
  status: HTMLElement,
  kind: ImageKind,
  save: (dataUrl: string) => Promise<void>,
): void {
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    status.hidden = false;
    status.textContent = "Processing...";
    try {
      await save(await processImage(file, kind));
      status.hidden = true;
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : "Could not process image";
    } finally {
      input.value = "";
    }
  });
}

/** Shows an image in a thumbnail slot, or the placeholder icon. Skips unchanged data URLs. */
export function setThumb(slot: HTMLElement, url: string | null): void {
  const img = slot.querySelector("img");
  if (url) {
    if (img) {
      if (img.getAttribute("src") !== url) img.src = url;
    } else {
      slot.innerHTML = `<img alt="" />`;
      slot.querySelector("img")!.src = url;
    }
  } else if (img || !slot.innerHTML) {
    slot.innerHTML = IMAGE_ICON;
  }
}
