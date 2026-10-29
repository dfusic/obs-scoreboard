import { matchPlayers, type LiveData } from "@shared/liveFeed";
import { programView, takeKey, viewScene } from "@shared/program";
import { useLiveData } from "@shared/react/store";
import { curtainColors } from "@shared/transitions";
import { SCENE_TYPES, type SceneType } from "@shared/types";
import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import { StaticModeProvider, useOverlayDocument } from "./context";
import { SCENES, SemaforStripes, type SceneTarget } from "./scenes";
import { TransitionCurtain, useSceneTransition } from "./Transition";

/**
 * Who the scene is about. Previews fall back to the home side and its first player.
 * `take` restarts self-running content (marquee, lineup scroll) on every new take; a
 * preview of a chosen scene follows no take, so there each replay counts as one.
 */
function sceneTarget(data: LiveData, preview: boolean, replay: number): SceneTarget {
  const { program } = data.match;
  const side = program.side ?? "home";
  const player = (program.playerId && data.players.get(program.playerId)) || null;
  if (preview && !player) return { side, player: matchPlayers(data, side)[0] ?? null, take: `replay:${replay}` };
  return { side, player, take: preview ? `replay:${replay}` : takeKey(program) };
}

interface Curtain {
  c1: string;
  c2: string;
  logo: string | null;
}

/**
 * Every scene, driven by props: the on-air page (`Overlay`) and the control page's
 * previews (ScenePreview.tsx, rendered into an iframe's document, see context.ts) both
 * render this. `previewScene` shows that scene instead of the one on air (null: on air);
 * changing `replay` (a counter) plays the transition again onto the scene shown.
 * `isStatic` renders a still of that one scene: only its section, cut transitions and
 * no timers (scenes read `useStaticMode()`); the document's body needs the `static`
 * class for the CSS side.
 */
export function OverlayView({
  data,
  previewScene,
  replay,
  isStatic = false,
}: {
  data: LiveData;
  previewScene: SceneType | null;
  replay: number;
  isStatic?: boolean;
}) {
  const doc = useOverlayDocument();
  const scene = previewScene ?? data.match.program.scene;
  const target = sceneTarget(data, previewScene !== null, replay);
  // What transitions run between: the scene and its side, so Lineup home → Lineup away
  // plays one. A previewed scene has no side of its own.
  const view = programView(previewScene ? { scene: previewScene, side: null } : data.match.program);
  // Each view keeps the target it had when it last went on air, so a view leaving keeps
  // showing who it was about (e.g. the intro's player while the next player's card comes
  // in, or the home lineup while the away one comes in), and each scene its last view.
  const targets = useRef<Record<string, SceneTarget>>({});
  const lastViews = useRef<Partial<Record<SceneType, string>>>({});
  targets.current[view] = target;
  lastViews.current[scene] = view;

  // A still cuts: it shows one settled scene.
  const transitionId = isStatic ? "cut" : data.graphics.transition;
  const { role, viewOf, sameSceneOut, shown, running } = useSceneTransition(view, transitionId, replay);
  const targetOf = (v: string | null | undefined) => (v && targets.current[v]) || target;

  // A scene's own background image replaces the default video (static in overlay.html,
  // rendered by ScenePreview in previews). Without one, the colour scheme's background
  // colour (if it has one) does. It follows the scene shown, so behind a curtain it
  // changes while covered.
  const background = data.scenes[viewScene(shown)].background;
  const bgColor = background === null ? data.graphics.colors.background : null;
  const themeId = data.graphics.theme;
  useEffect(() => {
    const { body } = doc;
    body.dataset.scene = viewScene(shown);
    body.dataset.theme = themeId;
    body.classList.toggle("has-bg-image", background !== null);
    body.classList.toggle("has-bg-color", bgColor !== null);
    body.style.backgroundColor = bgColor ?? "";
  }, [doc, shown, themeId, background, bgColor]);
  // Every scene's accent is the colour scheme's highlight.
  const accent = { "--accent": data.graphics.colors.highlight } as CSSProperties;
  // The curtain's colours and logo are those of the take that started the transition,
  // kept while it runs, so a retarget mid-transition doesn't make them jump.
  const curtain = useRef<{ startMs: number; value: Curtain } | null>(null);
  if (running?.def.kind === "cover" && curtain.current?.startMs !== running.startMs) {
    const team = data.teams[target.side];
    curtain.current = {
      startMs: running.startMs,
      value: { ...curtainColors(data.graphics.colors, scene, target.side, team), logo: (team ?? data.teams.home)?.logo ?? null },
    };
  }

  return (
    <StaticModeProvider value={isStatic}>
      <img className="bg-image" src={background ?? undefined} alt="" />
      {themeId === "semafor" && <SemaforStripes colors={data.graphics.colors} />}
      {(isStatic ? [scene] : SCENE_TYPES).map((type) => {
        const Scene = SCENES[type];
        const config = data.scenes[type];
        return (
          <Fragment key={type}>
            <section className="scene" data-layer={type} data-tr={role(type)} style={accent}>
              <Scene data={data} config={config} target={targetOf(viewOf(type) ?? lastViews.current[type])} />
            </section>
            {/* The same scene for the other side: the side leaving, until the transition ends. */}
            {sameSceneOut && viewScene(sameSceneOut.view) === type && (
              <section className="scene" data-layer={type} data-tr={sameSceneOut.role} style={accent}>
                <Scene data={data} config={config} target={targetOf(sameSceneOut.view)} />
              </section>
            )}
          </Fragment>
        );
      })}
      {running?.def.kind === "cover" && curtain.current && <TransitionCurtain id={running.def.id} {...curtain.current.value} />}
    </StaticModeProvider>
  );
}

/** The on-air output page: what's on air, from the store. */
export function Overlay() {
  return <OverlayView data={useLiveData()} previewScene={null} replay={0} />;
}
