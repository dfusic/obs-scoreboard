import { OUTPUT_CHANNEL, type OutputFullscreenMessage, type OutputStateMessage } from "@shared/outputWindow";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** The output window this page opened on a screen, as it last reported itself. */
export interface OutputWindow {
  win: Window;
  fullscreen: boolean;
}

interface OutputWindowState {
  /** null while no output window has reported (not open, or opened as a plain tab before a reload). */
  output: OutputWindow | null;
  /** The screen it was last opened on from the sidebar menu, if known. */
  screenLabel: string | null;
  setScreenLabel: (label: string | null) => void;
}

const OutputWindowContext = createContext<OutputWindowState>({
  output: null,
  screenLabel: null,
  setScreenLabel: () => {},
});

/**
 * Tracks the output window opened from this page: it reports to its opener on load, on every
 * fullscreen change and when it closes. After a reload of this page, asks it to report again.
 * Shared by the sidebar and the Match setup kick-off check.
 */
export function OutputWindowProvider({ children }: { children: ReactNode }) {
  const [output, setOutput] = useState<OutputWindow | null>(null);
  const [screenLabel, setScreenLabel] = useState<string | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent<OutputStateMessage>) => {
      if (e.origin !== location.origin || e.data?.type !== "output-state") return;
      const win = e.source as Window | null;
      setOutput(e.data.open && win ? { win, fullscreen: e.data.fullscreen } : null);
    };
    window.addEventListener("message", onMessage);
    const channel = new BroadcastChannel(OUTPUT_CHANNEL);
    channel.postMessage("report");
    return () => {
      window.removeEventListener("message", onMessage);
      channel.close();
    };
  }, []);
  const value = {
    output: output && !output.win.closed ? output : null,
    screenLabel: output ? screenLabel : null,
    setScreenLabel,
  };
  return <OutputWindowContext.Provider value={value}>{children}</OutputWindowContext.Provider>;
}

export const useOutputWindow = () => useContext(OutputWindowContext);

/** `postMessage` options with capability delegation (Chrome/Edge 104+; not in TypeScript's DOM lib yet). */
type DelegatingPostMessageOptions = WindowPostMessageOptions & { delegate?: "fullscreen" };

/**
 * Puts the output window into fullscreen (or back). Call it from a click handler: fullscreen
 * needs a click in the window going fullscreen, so this click is passed on with the message.
 * Where the browser can't delegate it, the output window goes fullscreen on its first click or
 * key press instead.
 */
export function setOutputFullscreen(output: OutputWindow, on: boolean) {
  const message: OutputFullscreenMessage = { type: "output-fullscreen", on };
  const options: DelegatingPostMessageOptions = { targetOrigin: location.origin, delegate: "fullscreen" };
  output.win.postMessage(message, options);
}
