import { stepIntro } from "@shared/lineup";
import { matchPlayers, type LiveData } from "@shared/liveFeed";
import { takeScene } from "@shared/program";
import { useLiveData, useStore } from "@shared/react/store";
import type { ProgramState } from "@shared/types";
import { useEffect, useRef } from "react";
import { Button, cn, Hint, Panel, PanelBody, PanelTitle } from "../ui";

const sceneButton = "h-14 text-[15px]";

/**
 * Player intro stepper: always shown at the same height, disabled until the intro is on air
 * (taken from the Scenes panel, where it opens on the club logo). Steps logo → first player → … → last, timed by the operator
 * to the commentary (buttons, arrow keys or a presenter clicker); Prev from the first
 * player goes back to the logo.
 */
export function PresentationPanel({ active }: { active: boolean }) {
  const store = useStore();
  const data = useLiveData();

  /** Last take from this panel, used until the snapshot catches up (fast double presses). */
  const lastTake = useRef<ProgramState | null>(null);
  const program = (live: LiveData): ProgramState => {
    const current = live.match.program;
    return lastTake.current && lastTake.current.startedAtMs > current.startedAtMs ? lastTake.current : current;
  };

  const onAir = program(data);
  const isOnAir = onAir.scene === "presentation";
  const side = onAir.side ?? "home";
  const players = matchPlayers(data, side);
  const index = onAir.playerId ? players.findIndex((p) => p.id === onAir.playerId) : -1;

  /** Shows the previous (-1) / next (+1) step; the club logo comes before the first player. */
  const step = (delta: number) => {
    const current = program(data);
    if (current.scene !== "presentation") return;
    const ids = matchPlayers(data, current.side ?? "home").map((p) => p.id);
    const playerId = stepIntro(ids, current.playerId, delta);
    if (playerId === current.playerId) return;
    lastTake.current = takeScene("presentation", Date.now(), { side: current.side, playerId });
    void store.match.setProgram(lastTake.current);
  };

  // Keyboard / presenter clicker, while the Live page is showing and the intro is on air.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!active || !isOnAir) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).closest("input, select, textarea, [contenteditable]")) return;
      // Not while a dialog (lineup editor) or popover (clock, scorer) is open on top.
      // Only those on the shown page: hidden pages stay mounted.
      const open = document.querySelectorAll("dialog[open], [role='dialog']");
      if ([...open].some((el) => !el.closest("[hidden]"))) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") stepRef.current(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") stepRef.current(-1);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, isOnAir]);

  const team = data.teams[side];
  const status = !isOnAir
    ? "Take Player intro to step through"
    : index >= 0
      ? players[index].name
      : players.length
        ? `Club logo · ${players.length} players next`
        : "Club logo · no players. Pick the lineup first.";

  // Always rendered at the same height (on air or not), so the panels around it never move.
  return (
    <Panel className={cn("border-2", isOnAir && "border-danger")}>
      <PanelTitle>
        <span className="truncate">Player intro{isOnAir && ` · ${team?.name ?? (side === "home" ? "Home" : "Away")}`}</span>
        {isOnAir && <span className="ml-auto shrink-0 text-danger">On air</span>}
      </PanelTitle>
      <PanelBody>
        <div className="flex min-h-7 items-baseline gap-2.5">
          <span
            className={cn(
              "font-condensed text-[22px] font-bold whitespace-nowrap tabular-nums",
              isOnAir ? "text-accent" : "text-dim",
            )}
          >
            {!isOnAir ? "–" : index >= 0 ? `${index + 1} / ${players.length}` : "Logo"}
          </span>
          <span className={cn("truncate text-[15px]", !isOnAir && "text-dim")}>{status}</span>
        </div>
        <div className="grid grid-cols-[1fr_1.4fr] gap-2">
          <Button variant="scene" className={sceneButton} disabled={!isOnAir || index < 0} onClick={() => step(-1)}>
            ◀ Prev
          </Button>
          <Button
            variant="scene"
            className={cn(sceneButton, isOnAir && "border-accent bg-accent text-white")}
            disabled={!isOnAir || players.length === 0 || index === players.length - 1}
            onClick={() => step(1)}
          >
            Next ▶
          </Button>
        </div>
        <Hint>Keys: ← / → (or a presenter clicker) while the Live page is open. Prev from the first player shows the club logo.</Hint>
      </PanelBody>
    </Panel>
  );
}
