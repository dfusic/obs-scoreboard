import { createRoot } from "react-dom/client";
import { Overlay } from "./Overlay";
import { StaticLiveDataProvider } from "./static";

/**
 * Entry of the static thumbnail page (static.html, see previewMessages.ts). A page of its
 * own so it never loads the store or Firebase, while the on-air page (main.tsx) stays one
 * bundle. Data comes only from the embedding control page's `preview-data` messages.
 */
createRoot(document.getElementById("root")!).render(
  <StaticLiveDataProvider>
    <Overlay />
  </StaticLiveDataProvider>,
);
