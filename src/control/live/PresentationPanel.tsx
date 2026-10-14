import { stepLineup } from "@shared/lineup";
import { matchPlayers, sidesWithPlayers, type LiveData } from "@shared/liveFeed";
import { activeScene, takeScene } from "@shared/program";
import { useTicking } from "@shared/react/hooks";
import { useLiveData, useStore } from "@shared/react/store";
import type { ProgramState, Side } from "@shared/types";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Hint, Panel, PanelBody, PanelTitle, Row, Spacer } from "../ui";

const sceneButton = "h-14 text-[15px]";

/**
 * Player intro: steps through the lineup one player at a time, timed by the operator
 * to the commentary (buttons, arrow keys or a presenter clicker).
 */
export function PresentationPanel({ active }: { active: boolean }) {
  const store = useStore();
  const data = useLiveData();
  const [chosenSide, setChosenSide] = useState<Side>("home");
  const sides = sidesWithPlayers(data.match);
  const side = sides.includes(chosenSide) ? chosenSide : "home";
  const players = matchPlayers(data, side);

  /** Last take from this panel, used until the snapshot catches up (fast double presses). */
  const lastTake = useRef<ProgramState | null>(null);

  /** The intro's current player, if the intro is what's on air for this side. */
  const currentPlayerId = (live: LiveData, nowMs: number): string | null => {
    let program = live.match.program;
    if (lastTake.current && lastTake.current.startedAtMs > program.startedAtMs) program = lastTake.current;
    return activeScene(program, nowMs) === "presentation" && program.side === side ? program.playerId : null;
  };
  const currentId = useTicking((now) => currentPlayerId(data, now));
  const index = currentId ? players.findIndex((p) => p.id === currentId) : -1;

  const take = (playerId: string) => {
    lastTake.current = takeScene("presentation", data.scenes.presentation.durationMs, Date.now(), { side, playerId });
    void store.match.setProgram(lastTake.current);
  };

  /** Shows the previous (-1) / next (+1) lineup player; starts at the first when the intro isn't on air. */
  const step = (delta: number) => {
    const playerId = stepLineup(
      players.map((p) => p.id),
      currentPlayerId(data, Date.now()),
      delta,
    );
    if (playerId) take(playerId);
  };

  // Keyboard / presenter clicker, while the Live page is showing.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).closest("input, select, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") stepRef.current(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") stepRef.current(-1);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <Panel>
      <PanelTitle>Player intro</PanelTitle>
      <PanelBody>
        {sides.length > 1 && (
          <Field label="Team" htmlFor="intro-side">
            <select id="intro-side" value={side} onChange={(e) => setChosenSide(e.target.value as Side)}>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </Field>
        )}
        <div className="flex min-h-7 items-baseline gap-2.5">
          <span className="font-condensed text-[22px] font-bold whitespace-nowrap text-accent tabular-nums">
            {index >= 0 ? `${index + 1} / ${players.length}` : "—"}
          </span>
          <span className="truncate text-[15px]">
            {index >= 0
              ? players[index].name
              : players.length
                ? `Not on air · ${players.length} players`
                : "No players. Pick the lineup first."}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_1.4fr] gap-2">
          <Button variant="scene" className={sceneButton} disabled={index <= 0} onClick={() => step(-1)}>
            ◀ Prev
          </Button>
          <Button
            variant="scene"
            className={`${sceneButton} border-accent bg-accent text-white`}
            disabled={players.length === 0 || index === players.length - 1}
            onClick={() => step(1)}
          >
            {index >= 0 ? "Next ▶" : "Start ▶"}
          </Button>
        </div>
        <Row>
          <Button variant="ghost" onClick={() => players[0] && take(players[0].id)}>
            Start from first
          </Button>
          <Spacer />
          <Button
            variant="ghost"
            onClick={() => {
              lastTake.current = null;
              void store.match.setProgram(takeScene("scoreboard", null, Date.now()));
            }}
          >
            Back to scoreboard
          </Button>
        </Row>
        <Hint>Keys: ← / → (or a presenter clicker) while the Live page is open.</Hint>
      </PanelBody>
    </Panel>
  );
}
