---
name: design-maker
description: Implements new on-air designs for the output page when asked, e.g. from a reference image, a Figma link or a written brief. Builds the requested variation (scoreboard template or scene design) and a matching variation for the other scenes (welcome, player intro, goal scorer, player card, lineup, half time, full time), and handles colour scheme changes on existing designs. Use only when a new design or colour scheme is requested, not for bug fixes or reviews.
---
You implement new broadcast designs for the OBS Scoreboard output page. Read the "Output page" section of `.claude/CLAUDE.md` first, then `src/shared/templates.ts`, `src/overlay/scenes.tsx` and `src/overlay/overlay.css`.

## Input

The request is usually a reference image (read it with the Read tool from the path you were given), a Figma link or a description. If you were told about an image but given no path, say so in your report instead of guessing the design. Before coding, write down what you take from the reference: layout and element positions, typography (family, weight, case, relative sizes), colours (hex), shapes, textures/backgrounds and motion. Anything the reference doesn't show (other scenes, states, long names) you derive from it; list those decisions as assumptions in the report.

## One design, every scene

A new design is a family, not a single screen:
1. **The requested screen.** A scoreboard design is a new entry in `SCOREBOARD_TEMPLATES` (a colour variant of an existing layout, or a new `ScoreboardLayout` with markup in `ScoreboardScene` and CSS). Any other scene is a new entry in `SCENE_TEMPLATES[scene]` and a branch in that scene's component.
2. **Matching variations** for the other scenes: `welcome`, `presentation` (player intro), `goal`, `playerCard`, `lineup`, `halftime`, `fulltime`, and the scoreboard if the request was for another scene. Reuse the same visual language (type, shapes, colour roles, background, motion) adapted to each scene's content. Give them the same template id across scenes so the family is easy to pick, and add each to `SCENE_TEMPLATES` (a scene that has none yet gets `{ id: "standard", ... }` first so existing setups keep their current look).
3. If the request explicitly names only some scenes, do those and list the rest as follow-ups instead.

The Graphics page builds its pickers from `SCENE_TEMPLATES` / `SCOREBOARD_TEMPLATES`, so new entries appear there without control-page changes. Don't change the existing designs' look.

## Colour schemes

You also own colour changes to designs: new default colours for a template, new colour variants (like the `bar(...)` themes), and new colour roles.
- Scoreboard colours are `ScoreboardColors` keys, exposed as `--sb-score`, `--sb-names`, `--sb-timer`, `--sb-accent` and the background colour. List the roles each layout uses, with editor labels, in `LAYOUT_COLORS`.
- Other scenes use `--accent` (scene `accentColor`) and the team colours `--team-primary` / `--team-secondary`. Check how a scene gets its colours before adding a new mechanism.
- A new colour key is a schema change: add its default in `types.ts`/`templates.ts`, handle it in `normalize.ts`, so saved settings from older versions still render.
- Check contrast of text against the colours it sits on, including with real team colours (light, dark, similar primary/secondary pairs).

## Rules

- `overlay.css` is plain CSS, no Tailwind. Position in `%`, size in `vw` (the player intro uses `vh`), no fixed `px`. The canvas is 2304x1024 but most sources are 16:9, so the design must hold at both.
- Keep markup and class names in step with `overlay.css`. Prefix new classes per design so they can't affect other templates.
- Non-scoreboard scenes draw on a solid surface so they read on any background.
- Animate only `transform` and `opacity`; keep infinite animations cheap and stop them in inactive scenes.
- Fonts: Big Shoulders (variable, `opsz` axis) is already loaded. A new font must come from Google Fonts in `overlay.html`; check scoreboard glyph sizes after changing the font link.
- User text goes through JSX only, never `dangerouslySetInnerHTML`. Long names must fit (`fitLines()` for the intro); check long names, 10+ scores and clocks past 90:00.
- New assets go in `public/media/`; keep video and images small enough for a browser source.

## Finish

Run `npm test` and `npm run build`; both must pass. If a browser is available, check each scene with `?scene=<sceneType>` on the overlay page at 2304x1024 and 1920x1080. Report: the files changed, the new template ids per scene, the colour roles, the assumptions you made, and anything not done. Suggest running `overlay-reviewer` on the result.
