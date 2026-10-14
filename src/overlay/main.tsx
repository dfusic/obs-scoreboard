import { createStore } from "@shared/store";
import { LiveDataProvider, StoreProvider } from "@shared/react/store";
import { createRoot } from "react-dom/client";
import { Overlay } from "./Overlay";

createRoot(document.getElementById("root")!).render(
  <StoreProvider store={createStore()}>
    <LiveDataProvider>
      <Overlay />
    </LiveDataProvider>
  </StoreProvider>,
);

// Half-speed background loop. Set after metadata loads so it survives loop restarts.
const bgVideo = document.querySelector<HTMLVideoElement>(".bg-video")!;
const BG_PLAYBACK_RATE = 0.5;
bgVideo.defaultPlaybackRate = BG_PLAYBACK_RATE;
bgVideo.playbackRate = BG_PLAYBACK_RATE;
bgVideo.addEventListener("loadedmetadata", () => {
  bgVideo.playbackRate = BG_PLAYBACK_RATE;
});
