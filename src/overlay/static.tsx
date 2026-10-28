import type { LiveData } from "@shared/liveFeed";
import { STATIC_READY, type PreviewDataMessage, type StaticReadyMessage } from "@shared/previewMessages";
import { ProvideLiveData } from "@shared/react/store";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Static mode (static.html?scene=<type>, see staticOutputUrl in previewMessages.ts): a still thumbnail of one
 * scene for the control page's galleries. Scenes read `useStaticMode()` to skip timers and
 * show their first, settled state.
 */
const StaticModeContext = createContext(false);

export const useStaticMode = () => useContext(StaticModeContext);

/**
 * Provides the same LiveData as LiveDataProvider, but from the embedding control page's
 * `preview-data` messages instead of a store. Renders nothing until the first one.
 */
export function StaticLiveDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LiveData | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent<PreviewDataMessage>) => {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      if (e.data?.type !== "preview-data" || !e.data.data?.match) return;
      setData(e.data.data);
    };
    window.addEventListener("message", onMessage);
    // Tell the embedding page we're listening, so it (re)sends the data (see STATIC_READY).
    if (window.parent !== window) window.parent.postMessage({ type: STATIC_READY } satisfies StaticReadyMessage, location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return (
    <StaticModeContext.Provider value={true}>{data && <ProvideLiveData data={data}>{children}</ProvideLiveData>}</StaticModeContext.Provider>
  );
}
