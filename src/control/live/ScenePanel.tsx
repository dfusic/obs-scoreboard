import { matchPlayers, sidesWithPlayers } from "@shared/liveFeed";
import { takeScene } from "@shared/program";
import { useLiveData, useStore } from "@shared/react/store";
import { SCENE_LABELS, SIDES, type SceneType, type Side } from "@shared/types";
import { useEffect, useState, type ReactNode } from "react";
import { Button, cn, Panel, PanelBody, PanelTitle } from "../ui";

const players = (n: number) => (n === 1 ? "1 player" : `${n} players`);

/** A scene button: label, a hint line about what it shows, and the on-air tally. */
function Tile({
  label,
  hint,
  onAir,
  onClick,
  className,
}: {
  label: string;
  hint?: ReactNode;
  onAir: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={onAir}
      onClick={onClick}
      className={cn(
        "flex h-[54px] min-w-0 flex-col items-start justify-center gap-0.5 border border-line-strong bg-control px-3 text-left text-[13px] text-soft",
        onAir && "border-2 border-danger bg-on-air-bg text-white",
        className,
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span className="truncate">{label}</span>
        {onAir && (
          <span className="ml-auto shrink-0 font-sans text-[10px] font-semibold tracking-[0.06em] text-danger">
            On air
          </span>
        )}
      </span>
      {hint !== undefined && (
        <span className="w-full truncate font-sans text-[11px] font-normal tracking-normal normal-case text-dim">{hint}</span>
      )}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="m-0 font-condensed text-[10px] font-bold tracking-[0.14em] text-muted uppercase">{title}</h3>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </section>
  );
}

/** Takes scenes on air. Every scene stays until the next take. */
export function ScenePanel() {
  const store = useStore();
  const data = useLiveData();
  const { program, score } = data.match;
  const sides = sidesWithPlayers(data.match);

  const take = (scene: SceneType, side: Side | null = null, playerId: string | null = null) =>
    void store.match.setProgram(takeScene(scene, Date.now(), { side, playerId }));
  const isOnAir = (scene: SceneType, side?: Side) => program.scene === scene && (!side || program.side === side);

  const scoreHint = `${data.teams.home?.shortName || data.teams.home?.name || "Home"} ${score.home}–${score.away} ${
    data.teams.away?.shortName || data.teams.away?.name || "Away"
  }`;
  const logos = data.sponsors.filter((s) => s.logo && !s.hidden).length;

  const perSide = (scene: SceneType, label: string) =>
    sides.map((side) => (
      <Tile
        key={`${scene}-${side}`}
        label={side === "home" ? label : `${label} away`}
        hint={players(matchPlayers(data, side).length)}
        onAir={isOnAir(scene, side)}
        onClick={() => take(scene, side)}
      />
    ));

  return (
    <Panel>
      <PanelTitle>Scenes</PanelTitle>
      <PanelBody className="gap-3 py-3">
        {/* The goal scene alone, the moment the ball goes in: it stays on air while the
            score and scorer are updated behind it (Score panel), until the next take. */}
        <Button
          variant="goal"
          aria-pressed={program.scene === "goal"}
          className={cn(
            "flex h-14 flex-col items-center justify-center gap-0 text-xl leading-none tracking-[0.08em]",
            program.scene === "goal" && "ring-2 ring-white ring-inset",
          )}
          onClick={() => take("goal")}
        >
          GOAL!
          <span className="mt-1 font-sans text-[11px] font-medium tracking-normal normal-case opacity-80">
            {program.scene === "goal" ? "On air · now + on the score" : "Then + on the score"}
          </span>
        </Button>

        <Group title="In play">
          <Tile label={SCENE_LABELS.scoreboard} hint={scoreHint} onAir={isOnAir("scoreboard")} onClick={() => take("scoreboard")} />
          <PlayerCardPicker onTake={(side, playerId) => take("playerCard", side, playerId)} onAir={isOnAir("playerCard")} />
        </Group>

        <Group title="Pre-match">
          <Tile
            label={SCENE_LABELS.welcome}
            hint={data.scenes.welcome.title || "Welcome"}
            onAir={isOnAir("welcome")}
            onClick={() => take("welcome")}
          />
          {/* Opens on the club logo; the Player intro panel then steps through the lineup. */}
          {perSide("presentation", SCENE_LABELS.presentation)}
          {perSide("lineup", SCENE_LABELS.lineup)}
          <Tile
            label={SCENE_LABELS.sponsors}
            hint={logos === 1 ? "1 logo" : `${logos} logos`}
            onAir={isOnAir("sponsors")}
            onClick={() => take("sponsors")}
          />
        </Group>

        <Group title="Breaks">
          <Tile label={SCENE_LABELS.halftime} hint={scoreHint} onAir={isOnAir("halftime")} onClick={() => take("halftime")} />
          <Tile label={SCENE_LABELS.fulltime} hint={scoreHint} onAir={isOnAir("fulltime")} onClick={() => take("fulltime")} />
        </Group>
      </PanelBody>
    </Panel>
  );
}

/**
 * Player card: pick a player and Take. The latest goal's scorer is listed first and
 * selected as soon as the scorer is set (Score panel).
 */
function PlayerCardPicker({ onTake, onAir }: { onTake: (side: Side, playerId: string) => void; onAir: boolean }) {
  const data = useLiveData();
  const sides = sidesWithPlayers(data.match);
  const groups = sides.map((s) => ({ side: s, players: matchPlayers(data, s) })).filter((g) => g.players.length);
  const [chosenId, setChosenId] = useState("");
  const lastScorerId = data.match.goals[data.match.goals.length - 1]?.playerId ?? null;
  const lastScorer = lastScorerId ? data.players.get(lastScorerId) : undefined;
  useEffect(() => {
    if (lastScorerId) setChosenId(lastScorerId);
  }, [lastScorerId]);
  const cardId = groups.some((g) => g.players.some((p) => p.id === chosenId)) ? chosenId : (groups[0]?.players[0]?.id ?? "");

  const take = () => {
    const player = data.players.get(cardId);
    if (!player) return;
    onTake(SIDES.find((s) => data.match.teams[s] === player.teamId) ?? "home", player.id);
  };

  // The player on air (it can differ from the one selected for the next take).
  const onAirPlayer = onAir && data.match.program.playerId ? data.players.get(data.match.program.playerId) : undefined;

  return (
    <div
      className={cn(
        "flex h-[54px] min-w-0 flex-col justify-center gap-0.5 border border-line-strong bg-control px-1.5",
        "rounded-sm",
        onAir && "border-2 border-danger bg-on-air-bg",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <select
          aria-label="Player card"
          title="Player card"
          value={cardId}
          onChange={(e) => setChosenId(e.target.value)}
          disabled={!groups.length}
          className={cn("h-9 min-w-0 flex-1 px-2 text-[13px]", onAir && "h-8")}
        >
          {!groups.length && <option value="">No players</option>}
          {lastScorer && groups.some((g) => g.players.includes(lastScorer)) && (
            <optgroup label="Last goal">
              <option value={lastScorer.id}>{lastScorer.name}</option>
            </optgroup>
          )}
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
        <Button
          variant="scene"
          aria-label="Take player card"
          title={onAir ? "Player card on air: Take shows the selected player" : "Take player card"}
          disabled={!cardId}
          className={cn("h-9 shrink-0 px-3", onAir && "h-8 border-danger bg-danger text-white")}
          onClick={take}
        >
          Take
        </Button>
      </div>
      {onAir && (
        <span className="truncate px-0.5 font-sans text-[11px] leading-tight text-soft" role="status">
          On air: {onAirPlayer?.name ?? "player card"}
        </span>
      )}
    </div>
  );
}
