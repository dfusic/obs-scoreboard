# Football Scoreboard

Live football broadcast graphics, synced through Firebase. No server to run: everything is static, hosted free on GitHub Pages.

- **Output page**: one page that draws every on-air graphic: scoreboard, welcome screen, player intro, goal scorer, player card, lineup, and half/full time. Open it full screen in a browser on a projector or second monitor while the operator keeps the control dashboard on their own screen. No broadcast software is needed.
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

**Auth:** the control dashboard has a username/password login (Firebase Authentication). [firestore.rules](firestore.rules) lets anyone *read* the match (so the output page needs no login) but only signed-in users *write*. To set it up:

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

### 3. Show it on a projector or second screen

The operator runs the control dashboard on their own device, and the output page is shown full screen on a projector or second monitor connected to it. Chrome or Edge is recommended.

1. Connect the projector / second monitor and set the display to **extend** (not duplicate).
2. Log in to the control dashboard. In the sidebar, under **Overlay URL**, click **Open** (↗) and pick the projector's screen. The first time, the browser asks for "window management" permission: allow it.
3. Click the **Fullscreen** button that appears next to it (highlighted while the output isn't fullscreen yet). The output fills the projector with no browser frame or mouse pointer, and your own screen keeps the dashboard. Click it again to leave fullscreen.
   - In other browsers, or with the output opened in a normal tab, click once anywhere on the output (or press any key there) to make it fullscreen. Esc leaves fullscreen.
4. The output keeps the display awake (Screen Wake Lock), so the projector and computer don't sleep or start a screensaver during the match. Keep the output window visible (not minimised).

The graphics are designed for a ~2.25:1 canvas (2304 × 1024) and scale to any screen of that aspect ratio. Switching between the scoreboard, welcome, goal and other graphics happens on the dashboard's **Live** page.

The control URL also works in any other browser (phone, tablet, second laptop): every logged-in dashboard controls the same output.

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

This starts the Firebase Auth + Firestore emulators, creates the login **admin / admin123**, and runs Vite. Open the printed URLs for `src/overlay/overlay.html` and `src/control/control.html` in two tabs (or two windows on two screens) to simulate the operator and projector setup. The Emulator UI at http://127.0.0.1:4000 shows the data. Local data is saved to `.emulator-data/` when you stop with Ctrl+C. Delete that folder to start fresh.

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
