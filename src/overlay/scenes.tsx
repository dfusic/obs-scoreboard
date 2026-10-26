import { formatClock } from "@shared/clock";
import { matchPlayers, type LiveData } from "@shared/liveFeed";
import { goalMinute } from "@shared/program";
import { scoreboardTemplate } from "@shared/templates";
import { useTicking } from "@shared/react/hooks";
import type { ClockState, Player, ScoreboardColors, SceneConfig, SceneType, Side, TeamProfile } from "@shared/types";
import { memo, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** What a scene is about, after applying any preview override. */
export interface SceneTarget {
  side: Side;
  player: Player | null;
}

interface SceneProps {
  data: LiveData;
  config: SceneConfig;
  target: SceneTarget;
}

const sideLabel = (side: Side) => (side === "home" ? "Home" : "Away");
const teamName = (team: TeamProfile | null, side: Side) => team?.name || sideLabel(side);
const shortName = (team: TeamProfile | null, side: Side) => team?.shortName || teamName(team, side);

/** A team's colours as CSS custom properties. */
function teamVars(team: TeamProfile | null): CSSProperties | undefined {
  if (!team) return undefined;
  return { "--team-primary": team.primaryColor, "--team-secondary": team.secondaryColor } as CSSProperties;
}

function Logo({ team, className }: { team: TeamProfile | null; className: string }) {
  return team?.logo ? <img className={className} src={team.logo} alt="" /> : <div className={`${className} logo-empty`} />;
}

function Header({ config }: { config: SceneConfig }) {
  return (
    <>
      {config.title && <div className="card-title">{config.title}</div>}
      {config.subtitle && <div className="card-subtitle">{config.subtitle}</div>}
    </>
  );
}

function TeamBlock({ data, side }: { data: LiveData; side: Side }) {
  const team = data.teams[side];
  return (
    <div className="team-block" style={teamVars(team)}>
      <Logo team={team} className="team-logo" />
      <div className="team-name">{teamName(team, side)}</div>
    </div>
  );
}

function ScoreLine({ data }: { data: LiveData }) {
  const { score } = data.match;
  return (
    <div className="score-line">
      <span>{shortName(data.teams.home, "home")}</span>
      <span className="score-line-num">{score.home}</span>
      <span className="score-line-sep">:</span>
      <span className="score-line-num">{score.away}</span>
      <span>{shortName(data.teams.away, "away")}</span>
    </div>
  );
}

function Scorers({ data, side }: { data: LiveData; side: Side }) {
  return (
    <ul className="scorers">
      {data.match.goals.map((g, i) =>
        g.side === side ? (
          <li key={i}>
            {(g.playerId && data.players.get(g.playerId)?.name) || "Goal"}{" "}
            <span className="minute">{goalMinute(g.elapsedMs)}'</span>
          </li>
        ) : null,
      )}
    </ul>
  );
}

/** Big photo (or the team logo when there is none) next to the player's details. */
function PlayerFeature({ data, config, target, children }: SceneProps & { children?: ReactNode }) {
  const team = data.teams[target.side];
  const { player } = target;
  return (
    <div className="card feature" style={teamVars(team)}>
      <div className="feature-media">
        {player?.photo ? (
          <img className="feature-photo" src={player.photo} alt="" />
        ) : (
          <Logo team={team} className="feature-photo feature-logo" />
        )}
      </div>
      <div className="feature-text">
        <Header config={config} />
        <div className="feature-name">{player?.name || teamName(team, target.side)}</div>
        <div className="feature-meta">{teamName(team, target.side)}</div>
        {children}
      </div>
    </div>
  );
}

/** "Adrijan Coha" -> ["Adrijan", "Coha"]: surname on its own, larger line. */
export function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? [parts.slice(0, -1).join(" "), parts[parts.length - 1]] : ["", parts[0] ?? ""];
}

/** Shrinks each line inside `box` that is wider than the box (long player names). */
function fitLines(box: HTMLElement): void {
  for (const line of box.children as HTMLCollectionOf<HTMLElement>) {
    line.style.fontSize = "";
    const overflow = line.scrollWidth / box.clientWidth;
    if (overflow > 1) line.style.fontSize = `${parseFloat(getComputedStyle(line).fontSize) / overflow}px`;
  }
}

function IntroName({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [first, last] = splitName(name);
  useLayoutEffect(() => {
    const fit = () => ref.current && fitLines(ref.current);
    fit();
    void document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [first, last]);
  return (
    <div className="intro-name" ref={ref}>
      {first && <span className="intro-first">{first}</span>}
      <span className="intro-last">{last}</span>
    </div>
  );
}

/**
 * Player intro: one lineup player at a time, stepped manually from the Live page.
 * Design: team-colour band with the crest, first name over a larger surname, and the
 * player's PNG cut-out standing on the bottom edge. Long names are shrunk to fit.
 * Keyed by player so the entry animations replay for each new player.
 */
function PresentationScene({ data, config, target }: SceneProps) {
  const team = data.teams[target.side];
  const { player } = target;
  // A custom background image (Graphics page) replaces the built-in striped one.
  return (
    <div
      key={player?.id ?? ""}
      className={config.background ? "intro" : "intro intro-default-bg"}
      style={teamVars(team)}
    >
      <div className="intro-band" />
      {team?.logo && <img className="intro-crest" src={team.logo} alt="" />}
      <IntroName name={player?.name ?? ""} />
      {player?.photo && <img className="intro-photo" src={player.photo} alt="" />}
    </div>
  );
}

/** Marquee speed, in screen widths per second. */
const MARQUEE_SPEED = 0.25;

/**
 * "Large text" welcome: the title (and subtitle) in screen-high letters, scrolling left
 * to right on an endless loop. The track holds two identical groups and moves by one
 * group's width per cycle, so the loop is seamless. Each group repeats the phrase enough
 * times to cover the screen, and the duration follows its width so the speed is constant.
 */
function Marquee({ title, subtitle }: { title: string; subtitle: string }) {
  const phraseRef = useRef<HTMLSpanElement>(null);
  const [layout, setLayout] = useState({ repeats: 1, durationS: 10 });

  useLayoutEffect(() => {
    const measure = () => {
      const width = phraseRef.current?.offsetWidth ?? 0;
      if (!width) return;
      const repeats = Math.max(1, Math.ceil(window.innerWidth / width));
      const durationS = (repeats * width) / (window.innerWidth * MARQUEE_SPEED);
      setLayout((prev) => (prev.repeats === repeats && Math.abs(prev.durationS - durationS) < 0.01 ? prev : { repeats, durationS }));
    };
    measure();
    void document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [title, subtitle]);

  const phrase = (key: number, ref?: typeof phraseRef) => (
    <span key={key} ref={ref} className="marquee-phrase">
      {title}
      {subtitle && (
        <>
          <span className="marquee-sep" />
          <span className="marquee-sub">{subtitle}</span>
        </>
      )}
      <span className="marquee-sep" />
    </span>
  );
  const group = (copy: number) => (
    <div className="marquee-group" aria-hidden={copy > 0 || undefined}>
      {Array.from({ length: layout.repeats }, (_, i) => phrase(i, copy === 0 && i === 0 ? phraseRef : undefined))}
    </div>
  );

  return (
    <div className="marquee">
      <div className="marquee-track" style={{ "--marquee-duration": `${layout.durationS}s` } as CSSProperties}>
        {group(0)}
        {group(1)}
      </div>
    </div>
  );
}

/** Ticks on its own, so the rest of the page re-renders only on new data. */
const ScoreboardClock = memo(function ScoreboardClock({ clock }: { clock: ClockState }) {
  const [minutes, seconds] = useTicking((now) => formatClock(clock, now)).split(":");
  return (
    <div className="clock">
      <span>{minutes}</span>
      <span className="clock-sep" />
      <span>{seconds}</span>
    </div>
  );
});

/** Template colours as CSS custom properties (see the scoreboard rules in overlay.css). */
function scoreboardVars(colors: ScoreboardColors): CSSProperties {
  return {
    "--sb-score": colors.score,
    "--sb-names": colors.names,
    "--sb-timer": colors.timer,
    "--sb-accent": colors.accent,
  } as CSSProperties;
}

const BarClock = memo(function BarClock({ clock }: { clock: ClockState }) {
  return <div className="bar-clock">{useTicking((now) => formatClock(clock, now))}</div>;
});

function BarSide({ data, side }: { data: LiveData; side: Side }) {
  const team = data.teams[side];
  return (
    <div className="bar-side">
      <img className="bar-logo" src={team?.logo ?? undefined} alt="" />
      <div className="bar-score">{data.match.score[side]}</div>
      <div className="bar-name">{teamName(team, side)}</div>
    </div>
  );
}

/** Semafor stripe geometry, in the 2304x1024 canvas: concentric bands around a centre off-screen top right. */
const STRIPE_CENTER = { x: 2800, y: -1300 };

/**
 * Each band is two dashed rings a little apart, so where only one of them has a dash
 * the band steps in or out, and where neither has one it breaks. A band turns as one
 * piece at its own slow speed (alternating direction), so the steps travel along it.
 * Seeded, so every client draws the same bands.
 */
const STRIPE_BANDS = (() => {
  let seed = 7;
  const rand = (min: number, max: number) => {
    seed = (seed * 16807) % 2147483647;
    return min + ((seed - 1) / 2147483646) * (max - min);
  };
  const dashes = () => Array.from({ length: 6 }, (_, i) => Math.round(i % 2 ? rand(120, 320) : rand(420, 1100))).join(" ");
  return Array.from({ length: 12 }, (_, i) => {
    const r = 1150 + i * 235;
    return {
      r,
      dashesA: dashes(),
      dashesB: dashes(),
      offsetB: Math.round(rand(0, 900)),
      // About 30-55 canvas px per second along the band, whatever its radius.
      durationS: Math.round((2 * Math.PI * r) / rand(30, 55)),
      reverse: i % 2 === 1,
    };
  });
})();

/** Never re-renders: the bands move by CSS animation and take their colour from --sb-accent. */
const SemaforStripes = memo(function SemaforStripes() {
  return (
    <svg className="sem-stripes" viewBox="0 0 2304 1024" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {STRIPE_BANDS.map((band) => (
        <g
          key={band.r}
          className="sem-band"
          style={
            {
              transformOrigin: `${STRIPE_CENTER.x}px ${STRIPE_CENTER.y}px`,
              animationDuration: `${band.durationS}s`,
              animationDirection: band.reverse ? "reverse" : "normal",
            } as CSSProperties
          }
        >
          <circle cx={STRIPE_CENTER.x} cy={STRIPE_CENTER.y} r={band.r} strokeDasharray={band.dashesA} />
          <circle
            cx={STRIPE_CENTER.x}
            cy={STRIPE_CENTER.y}
            r={band.r + 32}
            strokeDasharray={band.dashesB}
            strokeDashoffset={band.offsetB}
          />
        </g>
      ))}
    </svg>
  );
});

const SemaforClock = memo(function SemaforClock({ clock }: { clock: ClockState }) {
  const [minutes, seconds] = useTicking((now) => formatClock(clock, now)).split(":");
  return (
    <div className="sem-clock">
      <span>{minutes}</span>
      <span className="sem-clock-sep" />
      <span>{seconds}</span>
    </div>
  );
});

/** Scorers by surname, as on the Semafor design ("HARAČI 12'"); just the minute when the scorer is unknown. */
function SemaforScorers({ data, side }: { data: LiveData; side: Side }) {
  return (
    <ul className="sem-scorers">
      {data.match.goals.map((g, i) => {
        if (g.side !== side) return null;
        const name = g.playerId ? data.players.get(g.playerId)?.name : undefined;
        return (
          <li key={i}>
            {name && `${splitName(name)[1]} `}
            {goalMinute(g.elapsedMs)}'
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Semafor: red background with black stripes turning slowly, under a dark panel that
 * blurs them. Names and cities over the clock, then crests (with scorers), the
 * competition logo and the score. The competition logo is the scoreboard scene's logo;
 * without one, the scene's title and subtitle are shown instead.
 */
function SemaforScoreboard({ data, config }: SceneProps) {
  const { score } = data.match;
  const { colors } = data.graphics;
  const style = { ...scoreboardVars(colors), "--sb-bg": colors.background ?? "transparent" } as CSSProperties;
  const name = (side: Side) => {
    const team = data.teams[side];
    return (
      <div className="sem-team">
        <div className="sem-name">{teamName(team, side)}</div>
        {team?.city && <div className="sem-city">{team.city}</div>}
      </div>
    );
  };
  const crest = (side: Side) => (
    <div className="sem-side">
      <img className="sem-crest" src={data.teams[side]?.logo ?? undefined} alt="" />
      <SemaforScorers data={data} side={side} />
    </div>
  );
  return (
    <div className="sb-semafor" style={style}>
      <SemaforStripes />
      <div className="sem-panel">
        {name("home")}
        <SemaforClock clock={data.match.clock} />
        {name("away")}
        <div className="sem-rule" />
        {crest("home")}
        <div className="sem-center">
          <div className="sem-competition">
            {config.logo ? (
              <img src={config.logo} alt="" />
            ) : (
              <>
                {config.title && <div>{config.title}</div>}
                {config.subtitle && <div>{config.subtitle}</div>}
              </>
            )}
          </div>
          <div className="sem-score">
            <span>{score.home}</span>
            <span className="sem-score-sep" />
            <span>{score.away}</span>
          </div>
        </div>
        {crest("away")}
      </div>
    </div>
  );
}

/** The scoreboard in the chosen template's layout (shared/templates.ts) and colours. */
function ScoreboardScene(props: SceneProps) {
  const { data } = props;
  const { score } = data.match;
  const { colors } = data.graphics;
  const { layout } = scoreboardTemplate(data.graphics.template);
  if (layout === "semafor") return <SemaforScoreboard {...props} />;
  if (layout === "bar") {
    return (
      <div className="sb-bar" style={scoreboardVars(colors)}>
        <BarSide data={data} side="home" />
        <div className="bar-center">
          <BarClock clock={data.match.clock} />
          <div className="bar-rule" />
          <div className="bar-half">{data.match.half === 1 ? "1st half" : "2nd half"}</div>
        </div>
        <BarSide data={data} side="away" />
      </div>
    );
  }
  return (
    <div style={scoreboardVars(colors)}>
      <ScoreboardClock clock={data.match.clock} />
      <img className="logo logo-home" src={data.teams.home?.logo ?? undefined} alt="" />
      <img className="logo logo-away" src={data.teams.away?.logo ?? undefined} alt="" />
      <div className="score">
        <span className="score-num">{score.home}</span>
        <span className="score-sep" />
        <span className="score-num">{score.away}</span>
      </div>
    </div>
  );
}

function ResultScene({ data, config }: SceneProps) {
  const { score } = data.match;
  return (
    <div className="card result">
      <Header config={config} />
      <div className="matchup">
        <div className="result-side">
          <TeamBlock data={data} side="home" />
          <Scorers data={data} side="home" />
        </div>
        <div className="result-score">
          {score.home}
          <span className="score-line-sep">:</span>
          {score.away}
        </div>
        <div className="result-side">
          <TeamBlock data={data} side="away" />
          <Scorers data={data} side="away" />
        </div>
      </div>
    </div>
  );
}

export const SCENES: Record<SceneType, (props: SceneProps) => ReactNode> = {
  scoreboard: ScoreboardScene,

  welcome: ({ data, config }) =>
    config.template === "largeText" ? (
      <Marquee title={config.title} subtitle={config.subtitle} />
    ) : (
      <div className="card welcome">
        <Header config={config} />
        <div className="matchup">
          <TeamBlock data={data} side="home" />
          <div className="vs">VS</div>
          <TeamBlock data={data} side="away" />
        </div>
      </div>
    ),

  presentation: PresentationScene,

  goal: (props) => {
    const goal = [...props.data.match.goals].reverse().find((g) => g.side === props.target.side);
    return (
      <PlayerFeature {...props}>
        {goal && <div className="feature-minute">{goalMinute(goal.elapsedMs)}'</div>}
        <ScoreLine data={props.data} />
      </PlayerFeature>
    );
  },

  playerCard: (props) => <PlayerFeature {...props} />,

  lineup: ({ data, config, target }) => {
    const team = data.teams[target.side];
    return (
      <div className="card lineup" style={teamVars(team)}>
        <div className="lineup-header">
          <Logo team={team} className="lineup-logo" />
          <div>
            <Header config={config} />
            <div className="feature-name">{teamName(team, target.side)}</div>
          </div>
        </div>
        <ol className="lineup-list">
          {matchPlayers(data, target.side).map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ol>
      </div>
    );
  },

  halftime: ResultScene,
  fulltime: ResultScene,
};
