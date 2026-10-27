import { matchPlayers, sidesWithPlayers } from "@shared/liveFeed";
import { takeScene } from "@shared/program";
import { useLiveData, useStore } from "@shared/react/store";
import { SCENE_LABELS, SIDES, type SceneType, type Side } from "@shared/types";
import { useEffect, useState } from "react";
import { Button, cn, Field, ON_AIR, Panel, PanelBody, PanelTitle } from "../ui";

/** One-click scenes (player intro and lineup are per side; away only with away players). GOAL! and the player card have their own controls. */
const QUICK_TAKES: { scene: SceneType; side?: Side; label: string }[] = [
  { scene: "scoreboard", label: SCENE_LABELS.scoreboard },
  { scene: "welcome", label: SCENE_LABELS.welcome },
  // Opens on the club logo; the Player intro panel then steps through the lineup.
  { scene: "presentation", side: "home", label: SCENE_LABELS.presentation },
  { scene: "presentation", side: "away", label: "Player intro away" },
  { scene: "lineup", side: "home", label: "Lineup" },
  { scene: "lineup", side: "away", label: "Lineup away" },
  { scene: "halftime", label: SCENE_LABELS.halftime },
  { scene: "fulltime", label: SCENE_LABELS.fulltime },
  { scene: "sponsors", label: SCENE_LABELS.sponsors },
];

export function ScenePanel() {
  const store = useStore();
  const data = useLiveData();
  const { program } = data.match;
  const sides = sidesWithPlayers(data.match);
  const onAir = program.scene;

  const take = (scene: SceneType, side: Side | null = null, playerId: string | null = null) =>
    void store.match.setProgram(takeScene(scene, Date.now(), { side, playerId }));

  const groups = sides.map((s) => ({ side: s, players: matchPlayers(data, s) })).filter((g) => g.players.length);
  const [chosenId, setChosenId] = useState("");
  // Once a goal's scorer is set (Score panel), their card is ready to take.
  const lastScorerId = data.match.goals[data.match.goals.length - 1]?.playerId ?? null;
  useEffect(() => {
    if (lastScorerId) setChosenId(lastScorerId);
  }, [lastScorerId]);
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
        {/* The goal scene alone, the moment the ball goes in: it stays on air while the
            score and scorer are updated behind it (Score panel), until the next take. */}
        <Button
          variant="goal"
          className={cn("h-14 text-xl tracking-[0.08em]", onAir === "goal" && "ring-2 ring-white ring-inset")}
          onClick={() => void store.match.setProgram(takeScene("goal", Date.now()))}
        >
          GOAL!
        </Button>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TAKES.map((t) =>
            t.side && !sides.includes(t.side) ? null : (
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
