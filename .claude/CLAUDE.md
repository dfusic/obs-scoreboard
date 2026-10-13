# OBS Scoreboard

Live football broadcast graphics. Two static pages synced through Firestore:

- **Output** (`src/overlay/`): the on-air page with every scene (scoreboard, welcome, player intro, goal scorer, player card, lineup, half/full time). It's loaded as a single Browser Source in OBS, vMix or any capture tool. Read-only, no login.
- **Control** (`src/control/`): the operator dashboard, with a **Live** page (`#/live`: lineup, player intro, score, clock, goals, switching scenes) and a **Setup** page (`#/setup`: teams, squads with PNG photos, scene templates). Requires Firebase Auth login.

There is no backend. The pages talk directly to Firebase. Production is GitHub Pages + project `granicar-scoreboard`. See **Environments** for local and staging, and README.md for one-time setup.

## Commands

```
npm run dev            # Firebase emulators (Auth+Firestore, UI on :4000) + seed + Vite; login admin / admin123
npm run dev:staging    # Vite against the staging Firebase project (no emulators)
npm run build          # tsc -b (type check only, noEmit) then vite build -> dist/ (production config)
npm run build:staging  # same, staging config
npm test               # vitest run (src/shared/*.test.ts)
npx vitest run -t "goalMinute"   # single test by name
```

## Environments

Selected by Vite mode, each with a committed `.env.<mode>` file holding that environment's public Firebase config (`VITE_FIREBASE_*`, typed in `src/vite-env.d.ts`, read in `src/shared/firebase.ts`). Don't name env files `*.local`; `.gitignore` ignores those.

| Mode | Firebase | Hosting / deploy |
|---|---|---|
| `development` | Emulators, project `demo-scoreboard` (`VITE_USE_EMULATORS=true`) | `npm run dev` (`scripts/dev-local.mjs`) |
| `staging` | `granicar-scoreboard-staging` | Firebase Hosting, `.github/workflows/deploy-staging.yml` on push/PR to `staging` |
| `production` | `granicar-scoreboard` | GitHub Pages, `.github/workflows/deploy.yml` on push to `main` |

- Emulator ports default to 8080/9099 (`firebase.json`); `VITE_FIRESTORE_EMULATOR_PORT` / `VITE_AUTH_EMULATOR_PORT` point the app at a second stack (e.g. for automated tests) without touching the developer's emulator data.
- Local dev never touches a real project. The `demo-` prefix makes Firebase refuse cloud access. Emulator data persists in `.emulator-data/` (exported on Ctrl+C). The emulators need Java 21+.
- `scripts/seed-emulator.mjs` creates the `admin` login. The match doc is created by `ensureMatchInitialized()` on first login.
- `.firebaserc` aliases: `default` → `demo-scoreboard`, `staging`, `prod`. A bare `npx firebase` command targets the demo project. Production rules are deployed by hand: `npx firebase deploy --only firestore:rules --project prod`. Staging rules deploy with each push to `staging`. **Deploy rules before shipping code that reads new paths.**
- The control page shows a `LOCAL` / `STAGING` badge whenever `APP_ENV !== "production"`.
- Branch flow: feature → PR into `staging` (preview URL) → merge → PR `staging` → `main`.

## Data model

Everything lives under `workspaces/{WORKSPACE_ID}` (`src/shared/workspace.ts`, single tenant `"default"` for now; multi-tenancy means choosing this id per customer). Types are in `src/shared/types.ts`.

| Path | Type | Repo |
|---|---|---|
| `live/match` | `MatchState`: `score`, `clock`, `teams` (side → team id), `lineup` (side → ordered player ids), `awayPlayers`, `goals[]`, `program` | `matchRepo.ts` |
| `teams/{id}` | `TeamProfile`: name, shortName, colours, `logo` | `teamRepo.ts` |
| `players/{id}` | `Player`: `teamId`, full `name`, `photo` (PNG cut-out) | `playerRepo.ts` |
| `scenes/{sceneType}` | `SceneConfig`: title, subtitle, accentColor, `background`, `durationMs` | `sceneRepo.ts` |

`firestore.rules`: anyone can read `workspaces/**`, and only signed-in users can write. The old `matches/current` doc is no longer used. Its rule is kept so older deployed overlays still load.

**`subscribeToLive` (`src/shared/liveFeed.ts`)** is what both pages use. It subscribes to the match, then only to the two selected teams and their players (re-subscribing when the teams change), plus the scene templates. It emits a combined `LiveData` (`match`, `teams`, `players` map, `squads` and ordered `lineups` per side, `scenes`).

**Lineup and the home-team focus.** Before the game the operator ticks who is playing and orders them (Live > Lineup); `match.lineup[side]` holds the ordered ids, and pure helpers live in `src/shared/lineup.ts` (tested). **Every scene and picker uses `matchPlayers(data, side)`**: the lineup once one is picked, else the whole squad. `match.awayPlayers` (off by default) says whether the away squad/photos exist; when off, `sidesWithPlayers()` is home-only: away players aren't loaded, away goals skip the scorer picker, and "Lineup away" is hidden. Changing a side's team clears its lineup; full reset keeps teams and lineups. The Setup page subscribes to the full team list and a single team's players separately.

**Images are inline data URLs.** There is no Cloud Storage, because it needs the paid Blaze plan. `fileToResizedDataUrl` (`src/shared/image.ts`) resizes client-side. Image kinds are in `src/control/dom.ts`: logos are PNG at 600px, player photos are PNG at 800px (transparent cut-outs), scene backgrounds are JPEG at 1920px. `processImage()` scales an image down further until its data URL fits (`MAX_DATA_URL_LENGTH`). "Add players from photos" creates one player per file, named by `nameFromFileName()`. Each image sits on its own team/player/scene doc so every doc stays under Firestore's 1 MiB limit. Don't put images on the match doc. When updating `<img>` tags, skip unchanged data URLs (`setImageSrc` / `setThumb`). The overlay only rewrites a scene layer's `innerHTML` when its HTML string changes.

**Schema evolution.** `normalize()` in each repo merges a loaded doc over defaults, so docs written by older versions still render. When you add a field: add its default (`createInitialMatchState()`, `NEW_TEAM`, `DEFAULT_SCENE_CONFIGS`, …), handle it in `normalize()`, and write match fields with dotted paths (`updateDoc(ref, { "teams.home": id })`). `resetMatch()` overwrites the match doc with `setDoc` (keeping the selected teams), which also removes stale fields.

## Clock and program: state, not counters

**Clock.** `ClockState` = `{ running, startEpochMs, accumulatedMs }`. Every client derives elapsed time locally (`computeElapsedMs`) and re-renders on a 250 ms `setInterval`. Firestore is written only on start/pause/adjust, so reloads and network blips cause no drift.

**Program (what's on air).** `ProgramState` = `{ scene, side, playerId, startedAtMs, autoReturnMs }`. `activeScene()` in `src/shared/program.ts` derives the visible scene locally. A timed scene (goal: 15 s by default, player card: 10 s) falls back to the scoreboard once `startedAtMs + autoReturnMs` has passed, with no extra write. "Take" = `setProgram(takeScene(...))`. `recordGoal()` bumps the score, appends a `GoalEvent` (with the match time) and optionally takes the goal scene, all in one transaction. `removeLastGoal()` is the undo.

**Player intro** (`presentation` scene) shows one lineup player at a time and stays on air. The operator steps with Prev/Next (`stepLineup()`), arrow keys or PageUp/PageDown (presenter clickers) on the Live page, timed to the commentary. `presentation-panel.ts` remembers its last take until the snapshot catches up, so fast double presses advance twice.

**Match writes never fail silently.** All match updates go through `updateMatch()` / `txUpdateMatch()`, which recreate a missing `live/match` doc and retry. The control page shows a top-bar warning for any rejected Firestore write (`unhandledrejection`), and every `onSnapshot` has an error handler (`logSubscriptionError`), because a failed listener stops for good.

`clock.ts` and `program.ts` are pure functions taking `nowMs`. Keep them pure, pass `Date.now()` from the caller, and add tests in `clock.test.ts` / `program.test.ts`.

## Control page structure

`src/control/main.ts` wires up login, then after sign-in subscribes (`subscribeToLive` + `subscribeToTeams`) and fans each snapshot out to the panels. `router.ts` toggles `[data-page]` containers by hash. Both pages stay mounted.

- Live panels are in `src/control/live/` (preview, score + goal picker, clock, match teams, scene switcher, actions).
- Setup panels are in `src/control/setup/` (teams list/editor, roster, scene settings).
- `initXPanel(root)` renders HTML once with `innerHTML` template strings and attaches listeners. `updateXPanel(root, data)` updates the DOM in place on every snapshot. Panels keep the latest snapshot in module state for their click handlers.
- **Escape user text** (team/player names, scene titles) with `esc()` from `src/shared/html.ts` in every template, including the overlay's, because the output page is public.
- Don't overwrite fields the operator is editing: use `setFieldValue()` (`src/control/dom.ts`). Lists with editable rows are reconciled by id (`roster-panel.ts`), not re-rendered.
- Text fields save on `change` (blur/enter). Plain DOM, no framework.
- **Previews** (`src/control/preview.ts`) embed the real output page in an iframe scaled from the 2304x1024 canvas. The Setup preview forces a scene through `postMessage({ type: "preview-scene", scene })` (or `?scene=`). The output page then shows that scene locally without going on air. The Setup preview iframe is created on first visit only.

## Output page

`src/overlay/overlay.html` has one `<section data-layer="<sceneType>">` per scene. The scoreboard markup is static there; the others are rendered by `src/overlay/scenes.ts` (`SCENE_RENDERERS`). `main.ts` toggles `.active` (CSS fades it in) and sets `body[data-scene]`. A scene's `background` image replaces the default video.

`overlay.css` targets a ~2.25:1 canvas (2304x1024). Everything is positioned in `%` and sized in `vw`, so the page scales to any Browser Source of the same aspect ratio. Avoid fixed `px` sizes there. Non-scoreboard scenes draw on a solid `.card` so they read on any background. Team colours come in as `--team-primary` / `--team-secondary`, and each scene's accent as `--accent`. The player intro follows the design from Figma (Granicar file, node 1408:23320): team-colour band, crest, first name over a larger surname, PNG cut-out on the bottom edge. It is sized in `vh` (its design is 16:9) and long names are shrunk by `fitText()` (`[data-fit]`).

Big Shoulders is loaded as a variable font with an optical-size axis. `body` pins `"opsz" 14`, which reproduces the static cut the scoreboard was designed with; the intro uses `"opsz" 72` (first name) and `26` (surname) at weight 400 to match its design. Check scoreboard glyph sizes if you change the font link. The background is `public/media/SemaforBG.mp4`, played at 0.5x (rate is re-applied on `loadedmetadata`). The page uses the Big Shoulders font and does **not** load `src/styles/variables.css`. Those design tokens apply only to the control page.

## Conventions and gotchas

- Import shared code via the `@shared/*` alias (configured in both `vite.config.ts` and `tsconfig.json`).
- TS is `strict` with `noUnusedLocals`/`noUnusedParameters`. `npm run build` fails on unused code.
- Fire-and-forget Firestore writes from UI handlers use `void promise`.
- Vite `base` is `/obs-scoreboard/` (overridable with `VITE_BASE_PATH`; staging uses `/`). Built pages keep their `src/...` paths: `/obs-scoreboard/src/overlay/overlay.html`.
- The Firebase config in `.env.*` is a public client identifier, not a secret. The staging service-account key is a secret and lives only in the GitHub secret `FIREBASE_SERVICE_ACCOUNT_STAGING`.
- `src/SemaforBG.mp4` looks like an unused duplicate. The overlay references `public/media/SemaforBG.mp4`.
