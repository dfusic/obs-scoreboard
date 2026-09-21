import { defineConfig } from "vite";
import { resolve } from "node:path";

// Assumes this deploys as a GitHub Pages *project* page at
// <username>.github.io/obs-scoreboard/. If the repo is ever renamed,
// update this to match (or set to "/" for a user/org page).
const base = process.env.VITE_BASE_PATH ?? "/obs-scoreboard/";

export default defineConfig({
  base,
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        overlay: resolve(__dirname, "src/overlay/overlay.html"),
        control: resolve(__dirname, "src/control/control.html"),
      },
    },
  },
});
