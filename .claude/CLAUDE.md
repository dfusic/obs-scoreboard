# OBS Scoreboard

Live football broadcast graphics. Two static React pages (Vite multi-page build) synced through Firestore:

- **Output** (`src/overlay/`): the on-air page with every scene (scoreboard, welcome, player intro, goal scorer, player card, lineup, half/full time). It's loaded as a single Browser Source in OBS, vMix or any capture tool. Read-only, no login.
- **Control** (`src/control/`): the operator dashboard, with a sidebar menu and three pages: **Live Control** (`#/live`: score, clock and halves, match teams, lineup, player intro, goals, switching scenes), **Teams** (`#/teams`: team cards with colours, logo and squad with PNG photos; the old `#/setup` opens it) and **Graphics** (`#/graphics`: scoreboard template and colours, scene options). Requires Firebase Auth login.

There is no backend. The pages talk directly to Firebase. Production is GitHub Pages + project `granicar-scoreboard`. See **Environments** for local and staging, and README.md for one-time setup.

## Data store and offline

The UI never imports Firebase. All reads and writes go through the `DataStore` interface (`src/shared/store/types.ts`: `auth`, `match`, `teams`, `players`, `scenes`, `sync`), picked by `createStore()` (`src/shared/store/index.ts`) and provided to React with `StoreProvider` / `useStore()` (`src/shared/react/store.tsx`). Today the only implementation is `src/shared/firestore/` (Firebase config, workspace paths, one `*Repo.ts` per API).

Offline is a planned feature, in two stages:
- **Network drops (works now):** Firestore uses a persistent multi-tab IndexedDB cache. Pages load the last state without a connection, writes are applied locally at once and sync on reconnect, and Auth keeps the session. The dashboard shows "Offline" (from `store.sync`, bottom right) after 3 s disconnected.
- **Fully local at the venue (planned):** a `local` `DataStore` (control and OBS overlay on one machine syncing through a local hub) chosen in `createStore()`. No UI changes should be needed.

Rules that keep both working: keep store operations domain-level ("record a goal"), not path-level. **No Firestore transactions or server reads in write paths**, because they fail offline (`recordGoal` uses `increment` / `arrayUnion`, `removeLastGoal` works from the caller's snapshot). **Never block the UI on a write promise.** Offline it only settles on reconnect, so fire with `void`. `create()` returns the new id synchronously for the same reason.

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

Selected by Vite mode, each with a committed `.env.<mode>` file holding that environment's public Firebase config (`VITE_FIREBASE_*`, typed in `src/vite-env.d.ts`, read in `src/shared/firestore/firebase.ts`). Don't name env files `*.local`; `.gitignore` ignores those.

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

Everything lives under `workspaces/{WORKSPACE_ID}` (`src/shared/firestore/workspace.ts`, single tenant `"default"` for now; multi-tenancy means choosing this id per customer). Types are in `src/shared/types.ts`.

| Path | Type | Firestore repo (`src/shared/firestore/`) |
|---|---|---|
| `live/match` | `MatchState`: `score`, `clock`, `teams` (side → team id), `lineup` (side → ordered player ids), `awayPlayers`, `goals[]`, `program`, `half` | `matchRepo.ts` |
| `teams/{id}` | `TeamProfile`: name, shortName, city, colours, `logo` | `teamRepo.ts` |
| `players/{id}` | `Player`: `teamId`, full `name`, `photo` (PNG cut-out) | `playerRepo.ts` |
| `scenes/{sceneType}` | `SceneConfig`: title, subtitle, accentColor, `background`, `logo` (scoreboard: competition logo), `durationMs` | `sceneRepo.ts` |
| `settings/graphics` | `GraphicsSettings`: scoreboard `template` id + `colors` | `graphicsRepo.ts` |

`firestore.rules`: anyone can read `workspaces/**`, and only signed-in users can write. The old `matches/current` doc is no longer used. Its rule is kept so older deployed overlays still load.

**`subscribeToLive(store, …)` (`src/shared/liveFeed.ts`)** is what both pages use, once per page via `LiveDataProvider` (read with `useLiveData()`). It subscribes to the match, then only to the two selected teams and their players (re-subscribing when the teams change), plus the scene templates. It emits a combined `LiveData` (`match`, `teams`, `players` map, `squads` and ordered `lineups` per side, `scenes`).

**Lineup and the home-team focus.** Before the game the operator ticks who is playing and orders them (Live > Lineup); `match.lineup[side]` holds the ordered ids, and pure helpers live in `src/shared/lineup.ts` (tested). **Every scene and picker uses `matchPlayers(data, side)`**: the lineup once one is picked, else the whole squad. `match.awayPlayers` (off by default) says whether the away squad/photos exist; when off, `sidesWithPlayers()` is home-only: away players aren't loaded, away goals skip the scorer picker, and "Lineup away" is hidden. Changing a side's team clears its lineup; full reset keeps teams and lineups. The Teams page subscribes to the full team list, and each team card to its players only while its squad is expanded.

**Images are inline data URLs.** There is no Cloud Storage, because it needs the paid Blaze plan. `fileToResizedDataUrl` (`src/shared/image.ts`) resizes client-side. Image kinds are in `src/control/images.ts`: logos are PNG at 600px, player photos are PNG at 800px (transparent cut-outs), scene backgrounds are JPEG at 1920px. `processImage()` scales an image down further until its data URL fits (`MAX_DATA_URL_LENGTH`). "Add players from photos" creates one player per file, named by `nameFromFileName()`. Each image sits on its own team/player/scene doc so every doc stays under Firestore's 1 MiB limit. Don't put images on the match doc. React only touches an `<img src>` when the data URL changes, so large images aren't re-decoded per snapshot.

**Schema evolution.** The backend-neutral normalizers in `src/shared/normalize.ts` merge loaded data over defaults, so docs written by older versions still render. When you add a field: add its default in `types.ts` (`createInitialMatchState()`, `NEW_TEAM`, `DEFAULT_SCENE_CONFIGS`, …), handle it in `normalize.ts`, and write match fields with dotted paths (`updateDoc(ref, { "teams.home": id })`). `match.reset()` overwrites the match doc with `setDoc` (keeping the selected teams), which also removes stale fields.

## Clock and program: state, not counters

**Clock.** `ClockState` = `{ running, startEpochMs, accumulatedMs }`. Every client derives elapsed time locally (`computeElapsedMs`) and re-renders on a 250 ms `setInterval`. Firestore is written only on start/pause/adjust, so reloads and network blips cause no drift.

**Program (what's on air).** `ProgramState` = `{ scene, side, playerId, startedAtMs, autoReturnMs }`. `activeScene()` in `src/shared/program.ts` derives the visible scene locally. A timed scene (goal: 15 s by default, player card: 10 s) falls back to the scoreboard once `startedAtMs + autoReturnMs` has passed, with no extra write. "Take" = `store.match.setProgram(takeScene(...))`. `recordGoal()` bumps the score, appends a `GoalEvent` (with the match time, computed by the caller) and optionally takes the goal scene, all in one write. `removeLastGoal()` is the undo.

**Player intro** (`presentation` scene) shows one lineup player at a time and stays on air. The operator steps with Prev/Next (`stepLineup()`), arrow keys or PageUp/PageDown (presenter clickers) on the Live page, timed to the commentary. `PresentationPanel.tsx` remembers its last take until the snapshot catches up, so fast double presses advance twice.

**Halves.** `match.half` (1 or 2) labels the scoreboard. The Live timer's half buttons call `startHalf()` with `halfStartClock()` (stopped at 00:00 / 45:00, in `clock.ts`); End half pauses and takes half time (1st) or full time (2nd) in one `endHalf()` write. Full reset goes back to the 1st half.

**Match writes never fail silently.** All Firestore match updates go through `updateMatch()` (`firestore/matchRepo.ts`), which recreates a missing `live/match` doc and retry. The control page shows a top-bar warning for any rejected Firestore write (`unhandledrejection`), and every `onSnapshot` has an error handler (`logSubscriptionError`), because a failed listener stops for good. Each dashboard panel sits in a `PanelBoundary`, so one crashing panel doesn't take the others down.

`clock.ts` and `program.ts` are pure functions taking `nowMs`. Keep them pure, pass `Date.now()` from the caller, and add tests in `clock.test.ts` / `program.test.ts`.

## Control page structure

`src/control/App.tsx` shows the login until Auth reports a user, then the dashboard: the sidebar (brand, env badge, nav, overlay URL with copy/open (with several screens in Chrome/Edge, Open lists them via the Window Management API and opens a window covering the chosen one; otherwise a new tab; the overlay toggles fullscreen on double-click), log out; a top bar under 820px), `LiveDataProvider` + `TeamsProvider` (`teamsContext.tsx`), the three pages, and the offline / save-error warnings (fixed bottom right). `useHashPage()` hides pages by hash; all stay mounted. Each page starts with `PageHeader` and lays out in `PageBody` (`ui.tsx`).

- Live panels are in `src/control/live/` (`LivePage.tsx` lays them out), the Teams page in `src/control/teams/` (`TeamsPage.tsx` cards, `Roster.tsx` squad), the Graphics page in `src/control/graphics/` (`GraphicsPage.tsx` owns the selected scene tab and the unsaved scoreboard draft).
- Shared building blocks are in `src/control/ui.tsx`: `Panel`/`PanelTitle`/`PanelBody`, `Button` with variants, `CommitInput`, `Thumb`, `UploadButton` + `useImageUpload`, `PanelBoundary`.
- **Styling is Tailwind v4**, configured CSS-first in `src/control/index.css` (`@theme` tokens such as `bg-panel`, `text-dim`, `border-line-strong`; global form/button styles in `@layer base`). Merge classes with `cn()` (tailwind-merge), so a `className` overrides a variant. Only the control page imports Tailwind.
- **Time-derived UI** (clocks, on-air highlight, countdowns) uses `useTicking(nowMs => value)` (`src/shared/react/hooks.ts`) in the smallest component possible. It checks every 250 ms but re-renders only when the value changes.
- Text fields use `CommitInput`: saves on native `change` (blur/Enter/closing a colour picker), not per keystroke, and snapshots don't overwrite a focused field. Give it (or its form) a `key` per record so switching records resets it.
- React escapes text, so user input is safe in JSX. Never use `dangerouslySetInnerHTML` with user text; the output page is public.
- **Previews** (`src/control/OutputPreview.tsx`) embed the real output page in an iframe scaled from the 2304x1024 canvas. The Graphics preview forces a scene through `postMessage({ type: "preview-scene", scene })` (or `?scene=`) and unsaved scoreboard colours through `postMessage({ type: "preview-graphics", graphics })`. The output page then shows them locally without going on air. The Graphics preview iframe is created on first visit only.

## Output page

`src/overlay/Overlay.tsx` renders one `<section data-layer="<sceneType>">` per scene (components in `scenes.tsx`, `SCENES`), toggles `.active` (CSS fades it in) and sets `body[data-scene]`. A scene's `background` image replaces the default video. The `<video>` stays static in `overlay.html`, because React doesn't render the `muted` attribute that autoplay needs. Keep the overlay's class names and markup in step with `overlay.css`, which is plain CSS (no Tailwind) on purpose. The intro is keyed by player so its entry animations replay for each player.

`overlay.css` targets a ~2.25:1 canvas (2304x1024). Everything is positioned in `%` and sized in `vw`, so the page scales to any Browser Source of the same aspect ratio. Avoid fixed `px` sizes there. Non-scoreboard scenes draw on a solid `.card` so they read on any background. Team colours come in as `--team-primary` / `--team-secondary`, and each scene's accent as `--accent`. The player intro follows the design from Figma (Granicar file, node 1408:23320): team-colour band, crest, first name over a larger surname, PNG cut-out on the bottom edge. It is sized in `vh` (its design is 16:9) and long names are shrunk by `fitLines()` (`IntroName`).

**Scoreboard templates** are defined in `src/shared/templates.ts` (`SCOREBOARD_TEMPLATES`): a layout (`classic` = the original design: white clock tab, crests and big score over the video; `bar` = crest, score and name per side with the timer and half in the middle; `semafor` = red background with black stripes turning slowly (SVG bands, CSS rotation, `SemaforStripes`) under a panel that blurs and darkens them with `backdrop-filter`, showing names + team `city`, clock, crests with scorers by surname, the competition logo (scoreboard scene's `logo`, else its title/subtitle; edited in the Graphics "Competition" panel) and score) plus default colours. `LAYOUT_COLORS` lists which colours each layout uses. The operator picks a template and edits its colours on the Graphics page as a draft (preview only) and saves it to `settings/graphics`. The scoreboard reads the colours as `--sb-score`, `--sb-names`, `--sb-timer`, `--sb-accent`; a non-null `background` colour replaces the video (`body.has-bg-color`), and a scoreboard background image overrides both. Classic's defaults reproduce the original look exactly. To add a template, add an entry (a new layout also needs markup in `ScoreboardScene` and CSS).

**Scene templates.** Other scenes can have several designs too: `SCENE_TEMPLATES` (same file) lists them per scene, the choice is `SceneConfig.template` (normalized with `sceneTemplateId()`, default `"standard"`), picked on the scene's Graphics tab, and the scene component branches on it. Welcome has `standard` (the card) and `largeText`: the title and subtitle in screen-high letters scrolling left to right on a loop (`Marquee` in `scenes.tsx`). Its track is two identical groups moved by 50%, each repeating the phrase to cover the screen, and its duration follows the measured width so the speed stays `MARQUEE_SPEED`.

Big Shoulders is loaded as a variable font with an optical-size axis. `body` pins `"opsz" 14`, which reproduces the static cut the scoreboard was designed with; the intro uses `"opsz" 72` (first name) and `26` (surname) at weight 400 to match its design. Check scoreboard glyph sizes if you change the font link. The background is `public/media/SemaforBG.mp4`, played at 0.5x (rate is re-applied on `loadedmetadata`). The page uses the Big Shoulders font and does **not** load the control page's Tailwind theme.

## Conventions and gotchas

- Import shared code via the `@shared/*` alias (configured in both `vite.config.ts` and `tsconfig.json`).
- TS is `strict` with `noUnusedLocals`/`noUnusedParameters`. `npm run build` fails on unused code.
- Fire-and-forget store writes from UI handlers use `void promise`.
- `@vitejs/plugin-react` is pinned to v5 because v6 needs Vite 8, and vitest 2 is on Vite 6.
- Vite `base` is `/obs-scoreboard/` (overridable with `VITE_BASE_PATH`; staging uses `/`). Built pages keep their `src/...` paths: `/obs-scoreboard/src/overlay/overlay.html`.
- The Firebase config in `.env.*` is a public client identifier, not a secret. The staging service-account key is a secret and lives only in the GitHub secret `FIREBASE_SERVICE_ACCOUNT_STAGING`.
- `src/SemaforBG.mp4` looks like an unused duplicate. The overlay references `public/media/SemaforBG.mp4`.
