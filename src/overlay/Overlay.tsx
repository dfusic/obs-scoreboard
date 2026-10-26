import { matchPlayers, type LiveData } from "@shared/liveFeed";
import { normalizeGraphics } from "@shared/normalize";
import { activeScene } from "@shared/program";
import { useTicking } from "@shared/react/hooks";
import { useLiveData } from "@shared/react/store";
import { SCENE_TYPES, type GraphicsSettings, type SceneType } from "@shared/types";
import { useEffect, useState, type CSSProperties } from "react";
import { SCENES, SemaforStripes, type SceneTarget } from "./scenes";

const isScene = (v: unknown): v is SceneType => (SCENE_TYPES as readonly unknown[]).includes(v);

/**
 * Preview override: the dashboard shows a scene without putting it on air, via
 * ?scene=<type> or a postMessage from the page embedding this one.
 */
function usePreviewScene(): SceneType | null {
  const [scene, setScene] = useState<SceneType | null>(() => {
    const param = new URLSearchParams(location.search).get("scene");
    return isScene(param) ? param : null;
  });
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.type !== "preview-scene") return;
      setScene(isScene(e.data.scene) ? e.data.scene : null);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return scene;
}

/** Preview override from the Graphics page: an unsaved theme and colours, shown only in its preview. */
function usePreviewGraphics(): GraphicsSettings | null {
  const [graphics, setGraphics] = useState<GraphicsSettings | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.type !== "preview-graphics") return;
      setGraphics(e.data.graphics ? normalizeGraphics(e.data.graphics) : null);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return graphics;
}

/** Who the scene is about. Previews fall back to the home side and its first player. */
function sceneTarget(data: LiveData, preview: boolean): SceneTarget {
  const { program } = data.match;
  const side = program.side ?? "home";
  const player = (program.playerId && data.players.get(program.playerId)) || null;
  if (preview && !player) return { side, player: matchPlayers(data, side)[0] ?? null };
  return { side, player };
}

export function Overlay() {
  const live = useLiveData();
  const previewGraphics = usePreviewGraphics();
  const data = previewGraphics ? { ...live, graphics: previewGraphics } : live;
  const previewScene = usePreviewScene();
  const onAir = useTicking((now) => activeScene(data.match.program, now));
  const scene = previewScene ?? onAir;
  const target = sceneTarget(data, previewScene !== null);

  // A scene's own background image replaces the default video (static, in overlay.html).
  // Without one, the colour scheme's background colour (if it has one) does.
  const background = data.scenes[scene].background;
  const bgColor = background === null ? data.graphics.colors.background : null;
  const themeId = data.graphics.theme;
  useEffect(() => {
    document.body.dataset.scene = scene;
    document.body.dataset.theme = themeId;
    document.body.classList.toggle("has-bg-image", background !== null);
    document.body.classList.toggle("has-bg-color", bgColor !== null);
    document.body.style.backgroundColor = bgColor ?? "";
  }, [scene, themeId, background, bgColor]);
  // Every scene's accent is the colour scheme's highlight.
  const accent = { "--accent": data.graphics.colors.highlight } as CSSProperties;

  return (
    <>
      <img className="bg-image" src={background ?? undefined} alt="" />
      {themeId === "semafor" && <SemaforStripes colors={data.graphics.colors} />}
      {SCENE_TYPES.map((type) => {
        const Scene = SCENES[type];
        return (
          <section
            key={type}
            className={type === scene ? "scene active" : "scene"}
            data-layer={type}
            style={accent}
          >
            <Scene data={data} config={data.scenes[type]} target={target} />
          </section>
        );
      })}
    </>
  );
}
