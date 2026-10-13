/**
 * Resizes an image file to fit within maxDimension and returns it as a data URL.
 * Images are stored inline in Firestore docs (1 MiB doc limit) instead of Cloud
 * Storage, which requires the paid Blaze plan even for small free-tier usage.
 * Use PNG for logos (keeps transparency) and JPEG for photos and backgrounds (much smaller).
 */
export function fileToResizedDataUrl(
  file: File,
  maxDimension: number,
  format: "image/png" | "image/jpeg" = "image/png",
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL(format, quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };
    img.src = objectUrl;
  });
}

/** Sets an <img> src only when it changed, so large data URLs aren't reloaded on every snapshot. */
export function setImageSrc(img: HTMLImageElement, url: string | null): void {
  if (url) {
    if (img.getAttribute("src") !== url) img.src = url;
  } else {
    img.removeAttribute("src");
  }
}
