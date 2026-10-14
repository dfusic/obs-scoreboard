import { useLiveData, useStore } from "@shared/react/store";
import { Button, Panel, PanelBody, PanelTitle } from "../ui";

export function ActionsPanel() {
  const store = useStore();
  const { match } = useLiveData();
  return (
    <Panel>
      <PanelTitle>Quick Actions</PanelTitle>
      <PanelBody className="gap-2">
        <Button
          variant="wide"
          onClick={() => confirm("Reset both scores and clear the goal list?") && void store.match.resetScores()}
        >
          Reset scores &amp; goals
        </Button>
        <Button
          variant="danger"
          onClick={() =>
            confirm(
              "Full reset? This clears the score, goals and clock and returns to the scoreboard. Teams and lineups stay.",
            ) && void store.match.reset(match)
          }
        >
          Full reset
        </Button>
      </PanelBody>
    </Panel>
  );
}
