const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes user-entered text (team/player names, scene titles) for innerHTML templates. */
export function esc(text: string | number | null | undefined): string {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}
