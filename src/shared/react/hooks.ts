import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

/** How often time-derived UI (clock, on-air scene, auto-return countdown) is recomputed. */
export const TICK_MS = 250;

/**
 * A value derived from the current time. Checked every tick, but the component only
 * re-renders when the result changes (e.g. once a second for "mm:ss"), so keep results
 * primitive and put this hook in the smallest component that needs it.
 */
export function useTicking<T>(compute: (nowMs: number) => T, intervalMs: number | null = TICK_MS): T {
  const value = compute(Date.now());
  const latest = useRef({ compute, value });
  useLayoutEffect(() => {
    latest.current = { compute, value };
  });
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    // null: computed once per render, no timer (e.g. still thumbnails).
    if (intervalMs === null) return;
    const id = setInterval(() => {
      const { compute, value } = latest.current;
      if (!Object.is(compute(Date.now()), value)) rerender();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return value;
}

/** Subscribes to a store callback while mounted (re-subscribing when `deps` change). */
export function useSubscription<T>(
  subscribe: (onChange: (value: T) => void) => () => void,
  initial: T,
  deps: unknown[],
): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    setValue(initial);
    return subscribe(setValue);
  }, deps);
  return value;
}
