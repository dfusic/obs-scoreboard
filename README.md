# Football Scoreboard

Live football broadcast graphics, synced through Firebase. No server to run: everything is static, hosted free on GitHub Pages.

- **Output page**: one page that draws every on-air graphic: scoreboard, welcome screen, player intro, goal scorer, player card, lineup, and half/full time. Add it once as a Browser Source (OBS, vMix, Streamyard, or any capture tool). No per-graphic scenes are needed in OBS.
- **Control dashboard**, with two pages:
  - **Live**: pre-match lineup (tick who plays, drag into order), player intro stepped with Prev/Next or arrow keys, score, clock, "Goal!" with scorer picker, one-click scene switching, and a live preview of the output.
  - **Setup**: teams (name, colours, logo), squads (full name + PNG photo; add a whole squad at once from photo files), and scene templates (title, subtitle, accent colour, background, auto-return time).

  The home team is the focus: the away squad is optional per match ("Away team players & photos available").

## One-time setup

### 1. Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) (free "Spark" plan).
2. **Build → Firestore Database** → Create database (production mode, any region).
3. **Project settings → General → Your apps → Add app → Web** — copy the resulting config object.
4. Paste those values into [.env.production](.env.production).
5. Deploy the rules (requires the [Firebase CLI](https://firebase.google.com/docs/cli)):
    ```
    npm install -g firebase-tools
    firebase login
    firebase init firestore   # point at your project, keep the existing firestore.rules file
    firebase deploy --only firestore:rules
    ```
    Or just paste the contents of [firestore.rules](firestore.rules) into the **Firestore Database → Rules** tab in the console and click Publish — simpler for a one-time setup.

**Auth:** the control dashboard has a username/password login (Firebase Authentication). [firestore.rules](firestore.rules) lets anyone *read* the match (so the OBS overlay needs no login) but only signed-in users *write*. To set it up:

1. Firebase console → **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
2. **Authentication → Users → Add user**. The login form takes a plain *username*; it is turned into `<username>@scoreboard.local`, so for username `admin` create the user `admin@scoreboard.local` with your password. (Typing a full email in the username box also works.)
3. Publish the updated rules (paste [firestore.rules](firestore.rules) into **Firestore Database → Rules**).

**No Firebase Storage:** Cloud Storage now requires the paid Blaze plan even for free-tier-sized usage, so images aren't uploaded there. Instead, [src/shared/image.ts](src/shared/image.ts) resizes each image in the browser and stores it as a data URL on its own Firestore document: logos as PNG (600px), player photos as JPEG (600px), and scene backgrounds as JPEG (1920px). One image per team, player or scene document keeps each well within Firestore's 1 MiB document limit.

### 2. GitHub Pages

1. Push this repo to GitHub as `obs-scoreboard` (public — GitHub Pages' free tier requires a public repo unless you have GitHub Pro).
2. **Repo Settings → Pages → Build and deployment → Source: GitHub Actions**. The included workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) builds and deploys on every push to `main`.
3. If you rename the repo, update `base` in [vite.config.ts](vite.config.ts) to match (`/your-repo-name/`).
4. After the first successful deploy, your pages are at:
   - Overlay: `https://<username>.github.io/obs-scoreboard/src/overlay/overlay.html`
   - Control: `https://<username>.github.io/obs-scoreboard/src/control/control.html`

   (Vite preserves the `src/overlay/overlay.html` path in the build output since that's the entry point location — confirm the exact built path by checking `dist/` after a build, or check the Pages deployment's file listing.)

### 3. Add to OBS

**Output (all on-air graphics):**
1. Sources → **+** → **Browser Source**.
2. URL: your deployed overlay URL.
3. Width/Height: a ~2.25:1 size matching the design canvas (e.g. `2304` × `1024`). The graphics scale to any size of that aspect ratio.
4. Leave "Shutdown source when not visible" **unchecked** so the clock and Firestore connection persist.

Switching between the scoreboard, welcome, goal and other graphics happens on the dashboard's **Live** page. You don't need a separate OBS scene for each one. Any other tool that can show a web page (vMix, Streamyard, a hardware switcher) works the same way.

**Control panel (operator UI, inside OBS):**
1. Docks → **Custom Browser Docks**.
2. Dock name: `Scoreboard Control`. URL: your deployed control URL.
3. It'll appear as a dockable panel in the OBS window — drag it wherever's convenient.

You can also just open the control URL in a normal browser tab (phone, tablet, second laptop) — it works identically outside OBS.

## Environments

| | Local | Staging | Production |
|---|---|---|---|
| Firebase | Emulators (`demo-scoreboard`) | `granicar-scoreboard-staging` | `granicar-scoreboard` |
| Config | `.env.development` | `.env.staging` | `.env.production` |
| Runs on | `npm run dev` | Firebase Hosting, push to `staging` | GitHub Pages, push to `main` |

Branch flow: feature branch → PR into `staging` (gets a preview URL) → merge (deploys staging) → PR `staging` → `main` (deploys production).

## Local development

Requires **Java 21+** for the Firebase emulators (`winget install EclipseAdoptium.Temurin.21.JDK`).

```
npm install
npm run dev
```

This starts the Firebase Auth + Firestore emulators, creates the login **admin / admin123**, and runs Vite. Open the printed URLs for `src/overlay/overlay.html` and `src/control/control.html` in two tabs to simulate the OBS split. The Emulator UI at http://127.0.0.1:4000 shows the data. Local data is saved to `.emulator-data/` when you stop with Ctrl+C. Delete that folder to start fresh.

Local development never touches a real Firebase project: the `demo-` project id makes Firebase refuse any cloud access. To run the UI locally against staging data instead, use `npm run dev:staging`.

## Staging (one-time setup)

1. Create a Firebase project `granicar-scoreboard-staging` (Spark plan). Enable **Firestore**, **Authentication → Email/Password**, and add a user (e.g. `admin@scoreboard.local`).
2. **Project settings → Your apps → Add Web app**, then paste the config values into [.env.staging](.env.staging).
3. Create a deploy key: run `npx firebase init hosting:github` and pick the staging project. It creates the service account and the GitHub secret. Then rename the secret to `FIREBASE_SERVICE_ACCOUNT_STAGING`. Alternatively, create a service-account JSON key in Google Cloud console (roles: Firebase Hosting Admin, Firebase Rules Admin) and add it as that repo secret by hand. Discard any workflow files the init command generates; [deploy-staging.yml](.github/workflows/deploy-staging.yml) already exists.
4. Create the `staging` branch from `main` and push it.

Pushes to `staging` deploy the Firestore rules and the site to `https://granicar-scoreboard-staging.web.app/src/control/control.html` (overlay: `/src/overlay/overlay.html`). PRs into `staging` get a temporary preview URL commented on the PR. The control page shows a **STAGING** badge so it is never mistaken for production.

Production Firestore rules are deployed by hand: `npx firebase deploy --only firestore:rules --project prod`.

## Tests

```
npm test
```

Covers the pure logic: the match clock ([src/shared/clock.ts](src/shared/clock.ts)) and the on-air scene with auto-return ([src/shared/program.ts](src/shared/program.ts)). Both are stored as state and derived locally, not as ticking counters, so reloads and network hiccups cause no drift.
