// `npm run dev`: starts the Firebase emulators (Auth + Firestore + UI), seeds a login,
// then runs Vite. Local data is saved to .emulator-data/ on Ctrl+C and reloaded next time.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const DATA_DIR = ".emulator-data";
// --import fails on a missing or empty dir, so only pass it once an export exists.
const importArg = existsSync(`${DATA_DIR}/firebase-export-metadata.json`) ? `--import ${DATA_DIR}` : "";
const viteArgs = process.argv.slice(2).join(" ");

const command = [
  "npx firebase emulators:exec",
  "--project demo-scoreboard",
  "--only auth,firestore",
  "--ui",
  importArg,
  `--export-on-exit ${DATA_DIR}`,
  `"node scripts/seed-emulator.mjs && vite ${viteArgs}"`,
]
  .filter(Boolean)
  .join(" ");

const child = spawn(command, { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
