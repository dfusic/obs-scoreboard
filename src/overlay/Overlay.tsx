import { matchPlayers, type LiveData } from "@shared/liveFeed";
import { normalizeGraphics } from "@shared/normalize";
import { useLiveData } from "@shared/react/store";
import type { PreviewScenesMessage } from "@shared/previewMessages";
import { SCENE_TYPES, type GraphicsSettings, type SceneConfigs, type SceneType } from "@shared/types";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { SCENES, SemaforStripes, type SceneTarget } from "./scenes";
import { useStaticMode } from "./static";
import { TransitionCurtain, useSceneTransition } from "./Transition";

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

/**
 * Preview override from the Graphics page: unsaved scene settings (e.g. its draft), shown
 * only in its preview. Each given scene's fields are merged over the saved config.
 */
function usePreviewScenes(): PreviewScenesMessage["scenes"] {
  const [scenes, setScenes] = useState<PreviewScenesMessage["scenes"]>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent<PreviewScenesMessage>) => {
      if (e.origin !== location.origin || e.data?.type !== "preview-scenes") return;
      const next = e.data.scenes;
      setScenes(next && typeof next === "object" ? next : null);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return scenes;
}

function withPreviewScenes(saved: SceneConfigs, preview: PreviewScenesMessage["scenes"]): SceneConfigs {
  if (!preview) return saved;
  const scenes = { ...saved };
  for (const type of SCENE_TYPES) {
    const config = preview[type];
    if (config && typeof config === "object") scenes[type] = { ...saved[type], ...config };
  }
  return scenes;
}

/** Counts "preview-transition" messages: the Graphics page asks to play the transition again. */
function usePreviewReplay(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === "preview-transition") setCount((c) => c + 1);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return count;
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
  const isStatic = useStaticMode();
  const previewGraphics = usePreviewGraphics();
  const previewScenes = usePreviewScenes();
  const scenes = useMemo(() => withPreviewScenes(live.scenes, previewScenes), [live.scenes, previewScenes]);
  const data = previewGraphics || previewScenes ? { ...live, graphics: previewGraphics ?? live.graphics, scenes } : live;
  const previewScene = usePreviewScene();
  const scene = previewScene ?? data.match.program.scene;
  const target = sceneTarget(data, previewScene !== null);
  // Each scene keeps the target it had when it last went on air, so a scene leaving keeps
  // showing who it was about (e.g. the intro's player while the next player's card comes in).
  const targets = useRef<Partial<Record<SceneType, SceneTarget>>>({});
  targets.current[scene] = target;

  // A static thumbnail cuts: it shows one settled scene.
  const transitionId = isStatic ? "cut" : data.graphics.transition;
  const { role, shown, running } = useSceneTransition(scene, transitionId, usePreviewReplay());

  // A scene's own background image replaces the default video (static, in overlay.html).
  // Without one, the colour scheme's background colour (if it has one) does. It follows
  // the scene shown, so behind a curtain it changes while covered.
  const background = data.scenes[shown].background;
  const bgColor = background === null ? data.graphics.colors.background : null;
  const themeId = data.graphics.theme;
  useEffect(() => {
    document.body.dataset.scene = shown;
    document.body.dataset.theme = themeId;
    document.body.classList.toggle("has-bg-image", background !== null);
    document.body.classList.toggle("has-bg-color", bgColor !== null);
    document.body.style.backgroundColor = bgColor ?? "";
  }, [shown, themeId, background, bgColor]);
  // Every scene's accent is the colour scheme's highlight.
  const accent = { "--accent": data.graphics.colors.highlight } as CSSProperties;

  return (
    <>
      <img className="bg-image" src={background ?? undefined} alt="" />
      {themeId === "semafor" && <SemaforStripes colors={data.graphics.colors} />}
      {(isStatic ? [scene] : SCENE_TYPES).map((type) => {
        const Scene = SCENES[type];
        return (
          <section key={type} className="scene" data-layer={type} data-tr={role(type)} style={accent}>
            <Scene data={data} config={data.scenes[type]} target={targets.current[type] ?? target} />
          </section>
        );
      })}
      {running?.kind === "cover" && (
        <TransitionCurtain
          id={running.id}
          colors={data.graphics.colors}
          logo={(data.teams[target.side] ?? data.teams.home)?.logo ?? null}
        />
      )}
    </>
  );
}
