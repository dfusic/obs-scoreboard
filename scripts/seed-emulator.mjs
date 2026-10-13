// Seeds the local Auth emulator with a login for the control page: admin / admin123.
// Run by `npm run dev` after the emulators start. Safe to run repeatedly.
const AUTH_EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const EMAIL = "admin@scoreboard.local";
const PASSWORD = "admin123";

const res = await fetch(
  `http://${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: false }),
  },
);

if (res.ok) {
  console.log(`Seeded emulator user: admin / ${PASSWORD}`);
} else {
  const body = await res.json().catch(() => ({}));
  if (body?.error?.message === "EMAIL_EXISTS") {
    console.log(`Emulator user exists: admin / ${PASSWORD}`);
  } else {
    console.error("Could not seed emulator user:", res.status, JSON.stringify(body));
    process.exit(1);
  }
}
