import { sidesWithPlayers } from "@shared/liveFeed";
import { useLiveData } from "@shared/react/store";
import { useEffect, useState } from "react";
import { LineupEditor, lineupCount, SideTabs, sideLabel, useLineupSide } from "../match/LineupEditor";
import { Button, Dialog, Panel } from "../ui";

/** The lineup at a glance on Live, with the editor in a dialog for late changes. */
export function LineupRow({ hidden }: { hidden: boolean }) {
  const data = useLiveData();
  const [open, setOpen] = useState(false);
  const [side, setSide, sides] = useLineupSide();
  // Leaving the Live page (e.g. a link in the dialog) closes it.
  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  const summary = sidesWithPlayers(data.match).map((s) =>
    data.teams[s] ? `${sideLabel(s)}: ${lineupCount(data.lineups[s].length, data.squads[s].length)}` : `${sideLabel(s)}: no team`,
  );

  return (
    <Panel className="flex items-center gap-3 px-4 py-2.5">
      <span className="font-condensed text-[11px] font-bold tracking-[0.12em] text-dim uppercase">Lineup</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-soft">{summary.join(" · ")}</span>
      <Button variant="small" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Edit lineup
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={
          <>
            Lineup
            <SideTabs side={side} onChange={setSide} sides={sides} />
          </>
        }
      >
        <div className="px-[18px] py-4">
          <LineupEditor key={side} side={side} />
        </div>
      </Dialog>
    </Panel>
  );
}
