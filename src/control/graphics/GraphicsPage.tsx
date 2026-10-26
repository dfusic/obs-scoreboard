import { useLiveData, useStore } from "@shared/react/store";
import { sameGraphics, scoreboardTemplate, templateSettings } from "@shared/templates";
import { SCENE_LABELS, SCENE_TYPES, type GraphicsSettings, type SceneType } from "@shared/types";
import { useEffect, useState } from "react";
import { OutputPreview } from "../OutputPreview";
import { Button, cn, Hint, PageBody, PageHeader, Panel, PanelBoundary, PanelTitle } from "../ui";
import { CompetitionPanel, SceneSettingsPanel } from "./SceneSettingsPanel";
import { ColorsPanel, TemplatePicker } from "./ScoreboardTemplates";

/**
 * Graphics: the scoreboard template and colours, and each scene's options. The preview
 * runs the real output page with the selected scene forced, so nothing here goes on air
 * until it is saved (scoreboard) or taken on the Live page (other scenes).
 */
export function GraphicsPage({ hidden, previewEnabled }: { hidden: boolean; previewEnabled: boolean }) {
  const store = useStore();
  const saved = useLiveData().graphics;
  const [selected, setSelected] = useState<SceneType>("scoreboard");
  /** Unsaved scoreboard look; null while it matches what's saved. */
  const [draft, setDraft] = useState<GraphicsSettings | null>(null);
  const dirty = draft !== null && !sameGraphics(draft, saved);
  const shown = draft ?? saved;

  // Drop the draft once it is saved (or edited back to the saved look).
  useEffect(() => {
    if (draft && sameGraphics(draft, saved)) setDraft(null);
  }, [draft, saved]);

  return (
    <div hidden={hidden}>
      <PageHeader title="Graphics" sub="Scoreboard template and colours, and the options of each scene">
        {dirty && (
          <span className="font-condensed text-[13px] font-bold tracking-[0.08em] text-warning uppercase">
            Unsaved scoreboard changes
          </span>
        )}
      </PageHeader>
      <PageBody>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Scene">
          {SCENE_TYPES.map((type) => (
            <Button
              key={type}
              variant="tab"
              role="tab"
              aria-selected={type === selected}
              className={cn(type === selected && "border-accent bg-control-hover text-fg")}
              onClick={() => setSelected(type)}
            >
              {SCENE_LABELS[type]}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-4 max-[1100px]:grid-cols-[minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel className="overflow-hidden bg-well">
              <PanelTitle>Preview · {SCENE_LABELS[selected]}</PanelTitle>
              {previewEnabled && <OutputPreview className="rounded-none" scene={selected} graphics={draft} />}
            </Panel>
            <Hint>Preview only. Scenes go on air when you take them on the Live page.</Hint>
            {selected === "scoreboard" && (
              <PanelBoundary name="Templates">
                <TemplatePicker value={shown} onPick={(id) => setDraft(templateSettings(id))} />
              </PanelBoundary>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {selected === "scoreboard" && (
              <PanelBoundary name="Colours">
                <ColorsPanel
                  value={shown}
                  dirty={dirty}
                  onChange={setDraft}
                  onSave={() => draft && void store.graphics.save(draft)}
                  onDiscard={() => setDraft(null)}
                />
              </PanelBoundary>
            )}
            {selected === "scoreboard" && scoreboardTemplate(shown.template).layout === "semafor" && (
              <PanelBoundary name="Competition">
                <CompetitionPanel />
              </PanelBoundary>
            )}
            <PanelBoundary name="Scene settings">
              <SceneSettingsPanel type={selected} />
            </PanelBoundary>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
