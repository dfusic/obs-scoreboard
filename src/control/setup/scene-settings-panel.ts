import { esc } from "@shared/html";
import { updateScene, type SceneConfigs } from "@shared/sceneRepo";
import { SCENE_LABELS, SCENE_TYPES, type SceneType } from "@shared/types";
import { BACKGROUND_IMAGE, bindImageUpload, setFieldValue, setThumb, UPLOAD_ICON } from "../dom";
import { createOutputPreview, type Preview } from "../preview";

let selected: SceneType = "welcome";
let scenes: SceneConfigs | null = null;
let preview: Preview | null = null;

export function initSceneSettingsPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title">Scenes</div>
    <div class="panel-body">
      <div class="tabs" role="tablist">
        ${SCENE_TYPES.map(
          (type) => `<button data-scene="${type}" type="button" role="tab" class="tab">${esc(SCENE_LABELS[type])}</button>`,
        ).join("")}
      </div>
      <div data-role="preview" class="setup-preview"></div>
      <p class="hint">Preview only. Nothing here goes on air until you take the scene on the Live page.</p>
      <div class="form-grid">
        <div class="field" data-text-only><label for="scene-title">Title</label><input id="scene-title" data-field="title" type="text" /></div>
        <div class="field" data-text-only><label for="scene-subtitle">Subtitle</label><input id="scene-subtitle" data-field="subtitle" type="text" /></div>
        <div class="field" data-text-only><label for="scene-accent">Accent colour</label><input id="scene-accent" data-field="accentColor" type="color" /></div>
        <div class="field" data-text-only>
          <label for="scene-duration">Back to scoreboard after (s)</label>
          <input id="scene-duration" data-field="durationMs" type="number" min="0" max="600" placeholder="Stay on air" />
        </div>
      </div>
      <div class="field">
        <label>Background</label>
        <div class="logo-row">
          <div class="logo-thumb bg-thumb" data-role="thumb"></div>
          <div class="logo-actions">
            <label class="upload-btn">${UPLOAD_ICON} Upload background<input data-role="file" type="file" accept="image/*" /></label>
            <button data-role="clear-bg" type="button" class="btn-ghost logo-remove">Use default video</button>
          </div>
        </div>
        <span data-role="status" class="error-text" hidden></span>
      </div>
    </div>
  `;

  root.querySelector(".tabs")!.addEventListener("click", (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-scene]");
    if (!tab) return;
    selected = tab.dataset.scene as SceneType;
    preview?.setScene(selected);
    render(root);
  });

  for (const input of root.querySelectorAll<HTMLInputElement>("[data-field]")) {
    input.addEventListener("change", () => {
      const field = input.dataset.field!;
      if (field === "durationMs") {
        const seconds = Number.parseFloat(input.value);
        void updateScene(selected, { durationMs: seconds > 0 ? Math.round(seconds * 1000) : null });
      } else {
        void updateScene(selected, { [field]: input.value.trim() });
      }
    });
  }

  bindImageUpload(
    root.querySelector('[data-role="file"]')!,
    root.querySelector('[data-role="status"]')!,
    BACKGROUND_IMAGE,
    (background) => updateScene(selected, { background }),
  );
  root.querySelector('[data-role="clear-bg"]')!.addEventListener("click", () => {
    void updateScene(selected, { background: null });
  });

  render(root);
}

function render(root: HTMLElement): void {
  for (const tab of root.querySelectorAll<HTMLElement>("[data-scene]")) {
    tab.classList.toggle("active", tab.dataset.scene === selected);
  }
  // The scoreboard and player intro have fixed designs; only their background is configurable.
  for (const el of root.querySelectorAll<HTMLElement>("[data-text-only]")) {
    el.hidden = selected === "scoreboard" || selected === "presentation";
  }
  if (!scenes) return;
  const config = scenes[selected];
  setFieldValue(root.querySelector("#scene-title")!, config.title);
  setFieldValue(root.querySelector("#scene-subtitle")!, config.subtitle);
  setFieldValue(root.querySelector("#scene-accent")!, config.accentColor);
  setFieldValue(root.querySelector("#scene-duration")!, config.durationMs ? String(config.durationMs / 1000) : "");
  setThumb(root.querySelector('[data-role="thumb"]')!, config.background);
  (root.querySelector('[data-role="clear-bg"]') as HTMLElement).hidden = !config.background;
}

export function updateSceneSettingsPanel(root: HTMLElement, next: SceneConfigs): void {
  scenes = next;
  render(root);
}

/** Creates the preview on first visit, so the Live page doesn't run a second output page. */
export function showSceneSettings(root: HTMLElement): void {
  preview ??= createOutputPreview(root.querySelector('[data-role="preview"]')!, selected);
}
