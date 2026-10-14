import { matchPlayers, type LiveData } from "@shared/liveFeed";
import { activeScene } from "@shared/program";
import { useTicking } from "@shared/react/hooks";
import { useLiveData } from "@shared/react/store";
import { SCENE_TYPES, type SceneType } from "@shared/types";
import { useEffect, useState, type CSSProperties } from "react";
import { SCENES, type SceneTarget } from "./scenes";

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

/** Who the scene is about. Previews fall back to the home side and its first player. */
function sceneTarget(data: LiveData, preview: boolean): SceneTarget {
  const { program } = data.match;
  const side = program.side ?? "home";
  const player = (program.playerId && data.players.get(program.playerId)) || null;
  if (preview && !player) return { side, player: matchPlayers(data, side)[0] ?? null };
  return { side, player };
}

export function Overlay() {
  const data = useLiveData();
  const previewScene = usePreviewScene();
  const onAir = useTicking((now) => activeScene(data.match.program, now));
  const scene = previewScene ?? onAir;
  const target = sceneTarget(data, previewScene !== null);

  // A scene's own background image replaces the default video (static, in overlay.html).
  const background = data.scenes[scene].background;
  useEffect(() => {
    document.body.dataset.scene = scene;
    document.body.classList.toggle("has-bg-image", background !== null);
  }, [scene, background]);

  return (
    <>
      <img className="bg-image" src={background ?? undefined} alt="" />
      {SCENE_TYPES.map((type) => {
        const Scene = SCENES[type];
        return (
          <section
            key={type}
            className={type === scene ? "scene active" : "scene"}
            data-layer={type}
            style={{ "--accent": data.scenes[type].accentColor } as CSSProperties}
          >
            <Scene data={data} config={data.scenes[type]} target={target} />
          </section>
        );
      })}
    </>
  );
}
