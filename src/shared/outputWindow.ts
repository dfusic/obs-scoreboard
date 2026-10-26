/**
 * Messages between the control page and the output window it opened on a projector / second
 * screen (same origin, `postMessage`). The output window reports to `window.opener`; the control
 * page keeps the reporting window as its handle for the Fullscreen button.
 */

/** Control → output: enter or leave fullscreen (sent with fullscreen capability delegation). */
export interface OutputFullscreenMessage {
  type: "output-fullscreen";
  on: boolean;
}

/** Output → its opener: on load, on every fullscreen change, on request and when closing. */
export interface OutputStateMessage {
  type: "output-state";
  open: boolean;
  fullscreen: boolean;
}

/** A (re)loaded control page asks every output window on this channel to report again. */
export const OUTPUT_CHANNEL = "scoreboard-output";
