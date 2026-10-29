import { createContext, useContext } from "react";

/**
 * The document the overlay renders into: the output page's own, or the iframe of a
 * control-page preview (see ScenePreview.tsx). Code that touches the page (body
 * attributes, transition variables, window size, fonts) goes through it, never the
 * global `document` / `window`.
 */
const OverlayDocumentContext = createContext<Document>(document);

export const OverlayDocumentProvider = OverlayDocumentContext.Provider;
export const useOverlayDocument = () => useContext(OverlayDocumentContext);
/** The overlay document's window (its size is the canvas). */
export const useOverlayWindow = () => useOverlayDocument().defaultView ?? window;

/**
 * Static mode: a still of one scene for the control page's galleries. Scenes read
 * `useStaticMode()` to skip timers and show their first, settled state.
 */
const StaticModeContext = createContext(false);

export const StaticModeProvider = StaticModeContext.Provider;
export const useStaticMode = () => useContext(StaticModeContext);
