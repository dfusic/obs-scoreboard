# OBS Football Scoreboard

A live football/soccer scoreboard for OBS: an on-air overlay (Browser Source)
plus an in-OBS control panel (Custom Browser Dock), synced through Firebase.
No server to run — everything is static, hosted free on GitHub Pages.

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

**No Firebase Storage:** Cloud Storage now requires the paid Blaze plan even for free-tier-sized usage, so team logos aren't uploaded there. Instead, [src/shared/image.ts](src/shared/image.ts) resizes the chosen logo image client-side (max 300px) and stores it as a base64 PNG data URL directly on the match document in Firestore — well within Firestore's 1 MiB document limit, no extra service needed.

### 2. GitHub Pages

1. Push this repo to GitHub as `obs-scoreboard` (public — GitHub Pages' free tier requires a public repo unless you have GitHub Pro).
2. **Repo Settings → Pages → Build and deployment → Source: GitHub Actions**. The included workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) builds and deploys on every push to `main`.
3. If you rename the repo, update `base` in [vite.config.ts](vite.config.ts) to match (`/your-repo-name/`).
4. After the first successful deploy, your pages are at:
   - Overlay: `https://<username>.github.io/obs-scoreboard/src/overlay/overlay.html`
   - Control: `https://<username>.github.io/obs-scoreboard/src/control/control.html`

   (Vite preserves the `src/overlay/overlay.html` path in the build output since that's the entry point location — confirm the exact built path by checking `dist/` after a build, or check the Pages deployment's file listing.)

### 3. Add to OBS

**Overlay (on-air graphic):**
1. Sources → **+** → **Browser Source**.
2. URL: your deployed overlay URL.
3. Width/Height: match your canvas resolution exactly (e.g. `3840` × `2160` for 4K).
4. Leave "Shutdown source when not visible" **unchecked** so the clock and Firestore connection persist across scene switches.

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

Covers the clock logic in [src/shared/clock.ts](src/shared/clock.ts) — the one piece of nontrivial pure logic in the app (survives reloads/network hiccups without drift by storing state, not a ticking counter).
