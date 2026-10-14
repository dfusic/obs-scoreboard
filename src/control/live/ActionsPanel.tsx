import { useLiveData, useStore } from "@shared/react/store";
import { Button } from "../ui";

export function ActionsPanel() {
  const store = useStore();
  const { match } = useLiveData();
  return (
    <div className="flex gap-2.5">
      <Button
        variant="wide"
        className="flex-1"
        onClick={() => confirm("Reset both scores and clear the goal list?") && void store.match.resetScores()}
      >
        Reset scores &amp; goals
      </Button>
      <Button
        variant="danger"
        className="flex-1"
        onClick={() =>
          confirm(
            "Full reset? This clears the score, goals and clock, goes back to the 1st half and returns to the scoreboard. Teams and lineups stay.",
          ) && void store.match.reset(match)
        }
      >
        Full reset
      </Button>
    </div>
  );
}
