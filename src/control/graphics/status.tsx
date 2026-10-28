import { cn } from "../ui";

/**
 * The three states of a graphics change, in the same colours everywhere on the page:
 * blue = unsaved (this page only), amber = saved, not on air, red = on air.
 */
export type ChangeState = "unsaved" | "saved" | null;

/** Which state a value is in: shown vs saved vs on air. */
export function changeState<T>(shown: T, saved: T, onAir: T): ChangeState {
  if (shown !== saved) return "unsaved";
  if (saved !== onAir) return "saved";
  return null;
}

const DOT = { unsaved: "bg-accent", saved: "bg-warning" } as const;
const DOT_LABEL = { unsaved: "Unsaved change", saved: "Saved, not on air" } as const;

/** A small dot marking a changed field or scene; nothing when it matches what's on air. */
export function ChangeDot({ state, className }: { state: ChangeState; className?: string }) {
  if (!state) return null;
  return (
    <span
      role="img"
      aria-label={DOT_LABEL[state]}
      title={DOT_LABEL[state]}
      className={cn("inline-block size-2 shrink-0 rounded-full align-middle", DOT[state], className)}
    />
  );
}

/** The legend of the three states, for the page header. */
export function StateLegend() {
  const item = "flex items-center gap-1.5 whitespace-nowrap";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim" aria-label="Legend">
      <span className={item}>
        <span className="size-2 rounded-full bg-accent" aria-hidden="true" /> Unsaved
      </span>
      <span className={item}>
        <span className="size-2 rounded-full bg-warning" aria-hidden="true" /> Saved, not on air
      </span>
      <span className={item}>
        <span className="size-2 rounded-full bg-danger" aria-hidden="true" /> On air
      </span>
    </div>
  );
}
