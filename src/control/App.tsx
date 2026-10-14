import { APP_ENV } from "@shared/env";
import { useSubscription } from "@shared/react/hooks";
import { LiveDataProvider, useStore } from "@shared/react/store";
import type { AppUser, SyncStatus } from "@shared/store";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { GraphicsPage } from "./graphics/GraphicsPage";
import { LivePage } from "./live/LivePage";
import { overlayUrl } from "./OutputPreview";
import { TeamsPage } from "./teams/TeamsPage";
import { TeamsProvider } from "./teamsContext";
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
  return user ? <Dashboard user={user} /> : <Login />;
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

type Page = "live" | "teams" | "graphics";

const icon = (children: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {children}
  </svg>
);

const PAGES: { id: Page; label: string; icon: ReactNode }[] = [
  {
    id: "live",
    label: "Live Control",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </>,
    ),
  },
  {
    id: "teams",
    label: "Teams",
    icon: icon(
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>,
    ),
  },
  {
    id: "graphics",
    label: "Graphics",
    icon: icon(
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </>,
    ),
  },
];

const LogoutIcon = () =>
  icon(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>,
  );

/** Hash router (#/live, #/teams, #/graphics; the old #/setup opens Teams). All pages stay mounted. */
function useHashPage(): Page {
  const read = (): Page => {
    const hash = location.hash.replace(/^#\/?/, "");
    if (hash === "setup") return "teams";
    return PAGES.some((p) => p.id === hash) ? (hash as Page) : "live";
  };
  const [page, setPage] = useState(read);
  useEffect(() => {
    const onChange = () => setPage(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return page;
}

function Dashboard({ user }: { user: AppUser }) {
  const store = useStore();
  const page = useHashPage();
  // The Graphics preview runs another output page, so it is only created once Graphics is opened.
  const [graphicsOpened, setGraphicsOpened] = useState(page === "graphics");
  useEffect(() => {
    if (page === "graphics") setGraphicsOpened(true);
  }, [page]);

  useEffect(() => {
    void store.match.ensureInitialized();
  }, [store]);

  return (
    <div className="flex min-h-screen max-[820px]:flex-col">
      <Sidebar page={page} user={user} />
      <main className="min-w-0 flex-1">
        <LiveDataProvider>
          <TeamsProvider>
            <LivePage hidden={page !== "live"} />
            <TeamsPage hidden={page !== "teams"} />
            <GraphicsPage hidden={page !== "graphics"} previewEnabled={graphicsOpened} />
          </TeamsProvider>
        </LiveDataProvider>
      </main>
      <div className="pointer-events-none fixed right-4 bottom-4 z-10 flex flex-col items-end gap-2">
        <SyncIndicator />
        <SaveError />
      </div>
    </div>
  );
}

const sidebarItem = cn(
  "flex w-full items-center gap-2.5 rounded-[7px] border-0 bg-transparent px-3 py-2.5 text-left no-underline",
  "font-sans text-sm font-medium tracking-normal normal-case text-dim transition-colors hover:bg-panel hover:text-soft hover:opacity-100",
  "max-[820px]:w-auto max-[820px]:px-2.5",
);

function Sidebar({ page, user }: { page: Page; user: AppUser }) {
  const store = useStore();
  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-line bg-well",
        "max-[820px]:static max-[820px]:h-auto max-[820px]:w-full max-[820px]:flex-row max-[820px]:items-center max-[820px]:border-r-0 max-[820px]:border-b",
      )}
    >
      <div className="border-b border-line px-5 pt-[22px] pb-[18px] max-[820px]:border-b-0 max-[820px]:px-4 max-[820px]:py-3">
        <div className="font-condensed text-lg leading-none font-black tracking-[0.06em] text-white uppercase">
          ScoreBoard
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-faint max-[820px]:hidden">
          Control <EnvBadge />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2.5 max-[820px]:flex-row max-[820px]:overflow-x-auto max-[820px]:p-1.5">
        {PAGES.map((p) => (
          <a
            key={p.id}
            href={`#/${p.id}`}
            aria-current={page === p.id ? "page" : undefined}
            className={cn(
              sidebarItem,
              "[&>svg]:text-faint",
              page === p.id && "bg-[#1a2035] text-white hover:bg-[#1a2035] hover:text-white [&>svg]:text-accent",
            )}
          >
            {p.icon}
            <span className="whitespace-nowrap max-[480px]:hidden">{p.label}</span>
          </a>
        ))}
      </nav>
      <OverlayLink />
      <div className="border-t border-line p-2.5 max-[820px]:border-t-0 max-[820px]:p-1.5">
        <div className="truncate px-3 pb-1.5 text-[11px] text-faint max-[820px]:hidden">Signed in as {user.label}</div>
        <button
          type="button"
          onClick={() => void store.auth.signOut()}
          aria-label="Log out"
          className={cn(sidebarItem, "hover:bg-[#1a0f0f] hover:text-danger")}
        >
          <LogoutIcon />
          <span className="max-[820px]:hidden">Log out</span>
        </button>
      </div>
    </aside>
  );
}

const CopyIcon = () =>
  icon(
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
  );

const OpenIcon = () =>
  icon(
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>,
  );

const sidebarIconButton = cn(
  "flex size-8 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-transparent p-0 text-muted",
  "hover:bg-control hover:text-fg hover:opacity-100",
);

/** The output page's address, to paste into the OBS / vMix Browser Source. */
function OverlayLink() {
  const url = overlayUrl();
  const [copied, setCopied] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard blocked (e.g. not a secure context): select it for Ctrl+C instead.
      urlRef.current?.select();
    }
  };

  return (
    <div className="flex flex-col gap-1.5 border-t border-line px-[22px] py-3 max-[820px]:flex-row max-[820px]:border-t-0 max-[820px]:px-1.5">
      <div className="flex items-center justify-between text-[11px] text-faint max-[820px]:hidden">
        Overlay URL
        {copied && (
          <span role="status" className="font-semibold text-success">
            Copied
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          ref={urlRef}
          type="text"
          readOnly
          value={url}
          aria-label="Overlay URL"
          onFocus={(e) => e.currentTarget.select()}
          className="h-8 min-w-0 flex-1 px-2 text-[11px] text-soft max-[820px]:hidden"
        />
        <button type="button" onClick={() => void copy()} aria-label="Copy overlay URL" title="Copy" className={sidebarIconButton}>
          <CopyIcon />
        </button>
        <a href={url} target="_blank" rel="noreferrer" aria-label="Open overlay" title="Open in a new tab"
          className={sidebarIconButton}>
          <OpenIcon />
        </a>
      </div>
    </div>
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
    <span role="status" className="rounded-sm border border-warning bg-page px-2.5 py-1 text-xs font-semibold text-warning">
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
