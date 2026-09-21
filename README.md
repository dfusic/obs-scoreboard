# OBS Football Scoreboard

A live football/soccer scoreboard for OBS: an on-air overlay (Browser Source)
plus an in-OBS control panel (Custom Browser Dock), synced through Firebase.
No server to run — everything is static, hosted free on GitHub Pages.

## One-time setup

### 1. Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) (free "Spark" plan).
2. **Build → Firestore Database** → Create database (production mode, any region).
3. **Project settings → General → Your apps → Add app → Web** — copy the resulting config object.
4. Paste those values into [src/shared/firebase.ts](src/shared/firebase.ts) (`firebaseConfig`).
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

## Local development

```
npm install
npm run dev
```

Open the printed URLs for `src/overlay/overlay.html` and `src/control/control.html` in two separate browser tabs to simulate the OBS split. This talks to your real Firebase project (no emulator) — safe to use since it's your own project and the worst case is test data in your own Firestore.

## Tests

```
npm test
```

Covers the clock logic in [src/shared/clock.ts](src/shared/clock.ts) — the one piece of nontrivial pure logic in the app (survives reloads/network hiccups without drift by storing state, not a ticking counter).
