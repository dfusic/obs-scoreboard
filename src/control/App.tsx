import { APP_ENV } from "@shared/env";
import { useSubscription } from "@shared/react/hooks";
import { LiveDataProvider, useLiveData, useStore } from "@shared/react/store";
import type { AppUser, SyncStatus } from "@shared/store";
import { useEffect, useState, type FormEvent } from "react";
import { LivePage } from "./live/LivePage";
import { SetupPage } from "./setup/SetupPage";
import { TeamsProvider } from "./teams";
import { Button, cn, ErrorText, Field, Panel, PanelBody, PanelTitle } from "./ui";

const ENV_LABEL = APP_ENV === "development" ? "Local" : APP_ENV;

// Make it obvious when this isn't the production dashboard.
if (APP_ENV !== "production") document.title = `[${ENV_LABEL.toUpperCase()}] ${document.title}`;

function EnvBadge() {
  if (APP_ENV === "production") return null;
  return (
    <span
      className={cn(
        "rounded-sm px-2 py-0.5 font-condensed text-xs font-bold tracking-[0.1em] text-black uppercase",
        APP_ENV === "development" ? "bg-accent" : "bg-warning",
      )}
    >
      {ENV_LABEL}
    </span>
  );
}

export function App() {
  const store = useStore();
  // undefined until Auth reports (avoids flashing the login form for a signed-in operator).
  const user = useSubscription<AppUser | null | undefined>((cb) => store.auth.subscribe(cb), undefined, [store]);
  if (user === undefined) return null;
  return user ? <Dashboard /> : <Login />;
}

function Login() {
  const store = useStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const { username, password } = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setError(null);
    setBusy(true);
    try {
      await store.auth.signIn(username, password);
    } catch (err) {
      setError(store.auth.describeError(err));
      setBusy(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-[340px]">
        <Panel>
          <PanelTitle>
            Scoreboard Control <EnvBadge />
          </PanelTitle>
          <PanelBody>
            <Field label="Username" htmlFor="login-username">
              <input id="login-username" name="username" type="text" autoComplete="username" autoCapitalize="none"
                required className="h-10" />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <input id="login-password" name="password" type="password" autoComplete="current-password" required
                className="h-10" />
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <Button type="submit" variant="start" disabled={busy} className="w-full">
              Sign in
            </Button>
          </PanelBody>
        </Panel>
      </form>
    </section>
  );
}

type Page = "live" | "setup";

/** Hash router (#/live, #/setup). Both pages stay mounted; only visibility changes. */
function useHashPage(): Page {
  const read = (): Page => (location.hash.replace(/^#\/?/, "") === "setup" ? "setup" : "live");
  const [page, setPage] = useState(read);
  useEffect(() => {
    const onChange = () => setPage(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return page;
}

function Dashboard() {
  const store = useStore();
  const page = useHashPage();
  // The Setup preview runs a second output page, so it is only created once Setup is opened.
  const [setupOpened, setSetupOpened] = useState(page === "setup");
  useEffect(() => {
    if (page === "setup") setSetupOpened(true);
  }, [page]);

  useEffect(() => {
    void store.match.ensureInitialized();
  }, [store]);

  return (
    <section className="mx-auto flex max-w-[1280px] flex-col gap-5 p-6 max-[480px]:p-4">
      <LiveDataProvider>
        <TeamsProvider>
          <TopBar page={page} />
          <LivePage hidden={page !== "live"} />
          <SetupPage hidden={page !== "setup"} previewEnabled={setupOpened} />
        </TeamsProvider>
      </LiveDataProvider>
    </section>
  );
}

function TopBar({ page }: { page: Page }) {
  const store = useStore();
  const running = useLiveData().match.clock.running;

  return (
    <header className="flex flex-wrap items-center gap-4 px-1">
      <div className="flex items-center gap-2">
        <div
          className={cn("size-2 shrink-0 rounded-full bg-warning", running && "bg-success shadow-[0_0_8px_var(--color-success)]")}
        />
        <span
          className={cn(
            "font-condensed text-[13px] font-bold tracking-[0.1em] text-warning uppercase",
            running && "text-success",
          )}
        >
          {running ? "Live" : "Paused"}
        </span>
      </div>
      <div className="h-4 w-px bg-line" />
      <span className="font-condensed text-[13px] tracking-[0.06em] text-dim uppercase">Scoreboard Control</span>
      <EnvBadge />
      <nav className="flex gap-1 rounded-sm border border-line-strong p-[3px]">
        {(["live", "setup"] as const).map((p) => (
          <a
            key={p}
            href={`#/${p}`}
            className={cn(
              "rounded px-3.5 py-[5px] font-condensed text-[13px] font-bold tracking-[0.08em] text-muted uppercase no-underline hover:text-fg",
              page === p && "bg-control-hover text-fg",
            )}
          >
            {p}
          </a>
        ))}
      </nav>
      <div className="grow" />
      <SyncIndicator />
      <SaveError />
      <Button variant="ghost" onClick={() => void store.auth.signOut()}>
        Sign out
      </Button>
    </header>
  );
}

/** How long the page must be disconnected before saying so (startup reads come from cache first). */
const OFFLINE_GRACE_MS = 3000;

/** Tells the operator when they're working offline; changes are kept and sync on reconnect. */
function SyncIndicator() {
  const store = useStore();
  const status = useSubscription<SyncStatus>((cb) => store.sync.subscribe(cb), { connected: true, pendingWrites: false }, [
    store,
  ]);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (status.connected) {
      setOffline(false);
      return;
    }
    const timer = setTimeout(() => setOffline(true), OFFLINE_GRACE_MS);
    return () => clearTimeout(timer);
  }, [status.connected]);

  if (!offline) return null;
  return (
    <span role="status" className="rounded-sm border border-warning px-2.5 py-1 text-xs font-semibold text-warning">
      Offline{status.pendingWrites ? ": changes will sync when back online" : ""}
    </span>
  );
}

/** Writes are fire-and-forget (`void promise`), so surface failures instead of losing them silently. */
function SaveError() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const onRejection = (e: PromiseRejectionEvent) => {
      const code = (e.reason as { code?: string } | null)?.code;
      if (!code) return;
      console.error("Save failed:", e.reason);
      setMessage(
        code === "permission-denied" ? "Not saved: no permission (signed out or rules not deployed)" : `Not saved: ${code}`,
      );
      clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(null), 8000);
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <span role="alert" className="rounded-sm bg-danger px-2.5 py-1 text-xs font-semibold text-white">
      {message}
    </span>
  );
}
