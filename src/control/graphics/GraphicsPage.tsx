import { useLiveData, useStore } from "@shared/react/store";
import { sameGraphics } from "@shared/themes";
import { SCENE_LABELS, SCENE_TYPES, type GraphicsSettings, type SceneType } from "@shared/types";
import { useEffect, useState } from "react";
import { OutputPreview } from "../OutputPreview";
import { Button, cn, Hint, PageBody, PageHeader, Panel, PanelBoundary, PanelTitle } from "../ui";
import { CompetitionPanel, SceneSettingsPanel } from "./SceneSettingsPanel";
import { ColorSchemePicker, LookPanel, ThemePicker } from "./ThemePanels";

/**
 * Graphics: the look of every scene (theme and colour scheme, global) and each scene's
 * own settings. The preview runs the real output page with the selected scene forced and
 * the unsaved look applied, so nothing here goes on air until the look is saved (theme
 * and colours) or a scene is taken on the Live page.
 */
export function GraphicsPage({ hidden, previewEnabled }: { hidden: boolean; previewEnabled: boolean }) {
  const store = useStore();
  const saved = useLiveData().graphics;
  const [selected, setSelected] = useState<SceneType>("scoreboard");
  /** Unsaved theme and colours; null while they match what's saved. */
  const [draft, setDraft] = useState<GraphicsSettings | null>(null);
  const dirty = draft !== null && !sameGraphics(draft, saved);
  const shown = draft ?? saved;

  // Drop the draft once it is saved (or edited back to the saved look).
  useEffect(() => {
    if (draft && sameGraphics(draft, saved)) setDraft(null);
  }, [draft, saved]);

  return (
    <div hidden={hidden}>
      <PageHeader title="Graphics" sub="Theme and colour scheme for every scene, and each scene's own settings">
        {dirty && (
          <span className="font-condensed text-[13px] font-bold tracking-[0.08em] text-warning uppercase">
            Unsaved look
          </span>
        )}
      </PageHeader>
      <PageBody>
        <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-4 max-[1100px]:grid-cols-[minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel className="overflow-hidden bg-well">
              <PanelTitle>Preview · {SCENE_LABELS[selected]}</PanelTitle>
              <div className="flex flex-wrap gap-1.5 px-[18px] py-2.5" role="tablist" aria-label="Scene">
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
              {previewEnabled && <OutputPreview className="rounded-none" scene={selected} graphics={draft} />}
            </Panel>
            <Hint>
              Preview only. Pick a scene to see the look on it and to edit its own settings. Scenes go on air when you
              take them on the Live page.
            </Hint>
            <PanelBoundary name="Theme">
              <ThemePicker value={shown} onChange={setDraft} />
            </PanelBoundary>
            <PanelBoundary name="Colour scheme">
              <ColorSchemePicker value={shown} onChange={setDraft} />
            </PanelBoundary>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <PanelBoundary name="Look">
              <LookPanel
                value={shown}
                dirty={dirty}
                onChange={setDraft}
                onSave={() => draft && void store.graphics.save(draft)}
                onDiscard={() => setDraft(null)}
              />
            </PanelBoundary>
            {selected === "scoreboard" && shown.theme === "semafor" && (
              <PanelBoundary name="Competition">
                <CompetitionPanel />
              </PanelBoundary>
            )}
            <PanelBoundary name="Scene settings">
              <SceneSettingsPanel type={selected} highlight={shown.colors.highlight} />
            </PanelBoundary>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
