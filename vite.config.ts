import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { resolve } from "node:path";

// Assumes this deploys as a GitHub Pages *project* page at
// <username>.github.io/obs-scoreboard/. If the repo is ever renamed,
// update this to match (or set to "/" for a user/org page).
const base = process.env.VITE_BASE_PATH ?? "/obs-scoreboard/";

export default defineConfig({
  base,
  // Tailwind only processes CSS that imports it (the control page); overlay.css stays plain CSS.
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        overlay: resolve(__dirname, "src/overlay/overlay.html"),
        // Still scene thumbnails for the control page (no store, no video).
        static: resolve(__dirname, "src/overlay/static.html"),
        control: resolve(__dirname, "src/control/control.html"),
      },
    },
  },
});
