import { matchPlayers, sidesWithPlayers } from "@shared/liveFeed";
import { activeScene, takeScene } from "@shared/program";
import { useTicking } from "@shared/react/hooks";
import { useLiveData, useStore } from "@shared/react/store";
import { SCENE_LABELS, SIDES, type SceneType, type Side } from "@shared/types";
import { useState } from "react";
import { Button, cn, Field, ON_AIR, Panel, PanelBody, PanelTitle } from "../ui";

/** One-click scenes. Lineup is per side; goal is taken from the score panel. */
const QUICK_TAKES: { scene: SceneType; side?: Side; label: string }[] = [
  { scene: "scoreboard", label: SCENE_LABELS.scoreboard },
  { scene: "welcome", label: SCENE_LABELS.welcome },
  { scene: "lineup", side: "home", label: "Lineup" },
  { scene: "lineup", side: "away", label: "Lineup away" },
  { scene: "halftime", label: SCENE_LABELS.halftime },
  { scene: "fulltime", label: SCENE_LABELS.fulltime },
];

export function ScenePanel() {
  const store = useStore();
  const data = useLiveData();
  const { program } = data.match;
  const sides = sidesWithPlayers(data.match);
  // Ticks so a timed scene's highlight moves back to the scoreboard on auto-return.
  const onAir = useTicking((now) => activeScene(program, now));

  const take = (scene: SceneType, side: Side | null = null, playerId: string | null = null) =>
    void store.match.setProgram(takeScene(scene, data.scenes[scene].durationMs, Date.now(), { side, playerId }));

  const groups = sides.map((s) => ({ side: s, players: matchPlayers(data, s) })).filter((g) => g.players.length);
  const [chosenId, setChosenId] = useState("");
  const cardId = groups.some((g) => g.players.some((p) => p.id === chosenId)) ? chosenId : (groups[0]?.players[0]?.id ?? "");

  const takePlayerCard = () => {
    const player = data.players.get(cardId);
    if (!player) return;
    take("playerCard", SIDES.find((s) => data.match.teams[s] === player.teamId) ?? "home", player.id);
  };

  return (
    <Panel>
      <PanelTitle>Scenes</PanelTitle>
      <PanelBody>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TAKES.map((t) =>
            t.scene === "lineup" && t.side && !sides.includes(t.side) ? null : (
              <Button
                key={t.label}
                variant="scene"
                className={cn(t.scene === onAir && (!t.side || t.side === program.side) && ON_AIR)}
                onClick={() => take(t.scene, t.side ?? null)}
              >
                {t.label}
              </Button>
            ),
          )}
        </div>
        <Field label="Player card" htmlFor="player-card-select">
          <div className="flex items-center gap-3">
            <select id="player-card-select" value={cardId} onChange={(e) => setChosenId(e.target.value)}>
              {groups.map((g) => (
                <optgroup key={g.side} label={data.teams[g.side]?.name ?? g.side}>
                  {g.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Button variant="scene" className={cn(onAir === "playerCard" && ON_AIR)} onClick={takePlayerCard}>
              Take
            </Button>
          </div>
        </Field>
      </PanelBody>
    </Panel>
  );
}
