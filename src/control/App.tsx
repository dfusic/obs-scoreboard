import { APP_ENV } from "@shared/env";
import { MatchSetupPage } from "./match/MatchSetupPage";
import { overlayUrl, OutputWindowProvider, setOutputFullscreen, useOutputWindow, type OutputWindow } from "./outputWindow";
import { useSubscription } from "@shared/react/hooks";
import { LiveDataProvider, useStore } from "@shared/react/store";
import type { AppUser, SyncStatus } from "@shared/store";
import {
  Component,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { GraphicsDraftProvider, GraphicsPendingLink } from "./graphics/draftContext";
import { GraphicsPage } from "./graphics/GraphicsPage";
import { LivePage } from "./live/LivePage";
import { SponsorsPage } from "./sponsors/SponsorsPage";
import { TeamsPage } from "./teams/TeamsPage";
import { TeamsProvider } from "./teamsContext";
import { Button, cn, ErrorText, Field, Panel, PanelBody, PanelBoundary, PanelTitle } from "./ui";

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

type Page = "match" | "live" | "teams" | "sponsors" | "graphics";

const icon = (children: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {children}
  </svg>
);

const PAGES: { id: Page; label: string; icon: ReactNode }[] = [
  {
    id: "live",
    label: "Live",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </>,
    ),
  },
  {
    id: "match",
    label: "Match setup",
    icon: icon(
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
    id: "sponsors",
    label: "Sponsors",
    icon: icon(
      <>
        <circle cx="12" cy="8" r="6" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
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

/** The sidebar's groups, in order. */
const NAV_GROUPS: { title: string; pages: Page[] }[] = [
  { title: "Match day", pages: ["live", "match"] },
  { title: "Library", pages: ["teams", "sponsors"] },
  { title: "Design", pages: ["graphics"] },
];

const LogoutIcon = () =>
  icon(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>,
  );

/**
 * Hash router (#/match, #/live, #/teams, #/sponsors, #/graphics; the old #/setup opens Teams).
 * Live is the default. All pages stay mounted.
 */
function useHashPage(): Page {
  const read = (): Page => {
    // #/graphics/<scene> is the Graphics page too (its scene editor).
    const hash = location.hash.replace(/^#\/?/, "").split("/")[0];
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

/**
 * Keeps one failing page from taking the dashboard (and Live) down. Its error panel is
 * hidden with its page, since all pages stay mounted.
 */
class PageBoundary extends Component<{ name: string; hidden: boolean; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(`${this.props.name} page failed:`, err, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div hidden={this.props.hidden} className="p-6 max-[480px]:p-4">
        <Panel>
          <PanelTitle>{this.props.name}</PanelTitle>
          <PanelBody>
            <ErrorText>This page failed. The other pages still work.</ErrorText>
            <Button variant="ghost" className="self-start" onClick={() => this.setState({ failed: false })}>
              Try again
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }
}

function Dashboard({ user }: { user: AppUser }) {
  const store = useStore();
  const page = useHashPage();
  // The Graphics preview runs another output page, so it is only created once Graphics is opened.
  const [graphicsOpened, setGraphicsOpened] = useState(page === "graphics");
  useEffect(() => {
    if (page === "graphics") setGraphicsOpened(true);
  }, [page]);

  // Graphics changes not on air (saved) or not saved: flagged on the sidebar's Graphics item.
  const [graphicsStatus, setGraphicsStatus] = useState({ pending: false, unsaved: false });

  useEffect(() => {
    void store.match.ensureInitialized();
  }, [store]);

  /** The pages, each behind its own boundary so one failing page leaves the others usable. */
  const pages = (stripRight: ReactNode) => (
    <>
      <PageBoundary name="Match setup" hidden={page !== "match"}>
        <MatchSetupPage hidden={page !== "match"} />
      </PageBoundary>
      <PageBoundary name="Live" hidden={page !== "live"}>
        <LivePage hidden={page !== "live"} stripRight={stripRight} />
      </PageBoundary>
      <PageBoundary name="Teams" hidden={page !== "teams"}>
        <TeamsPage hidden={page !== "teams"} />
      </PageBoundary>
      <PageBoundary name="Sponsors" hidden={page !== "sponsors"}>
        <SponsorsPage hidden={page !== "sponsors"} />
      </PageBoundary>
      <PageBoundary name="Graphics" hidden={page !== "graphics"}>
        <GraphicsPage hidden={page !== "graphics"} previewEnabled={graphicsOpened} />
      </PageBoundary>
    </>
  );

  return (
    <OutputWindowProvider>
      <div className="flex min-h-screen max-[820px]:flex-col">
        <Sidebar page={page} user={user} graphicsStatus={graphicsStatus} />
        <main className="min-w-0 flex-1">
          <LiveDataProvider>
            <TeamsProvider>
              {/* If the Graphics draft itself fails, the pages still render without it: Live
                  (minus its graphics notice), Teams and Sponsors keep working. */}
              <PanelBoundary name="Graphics draft" fallback={pages(null)}>
                <GraphicsDraftProvider onStatus={setGraphicsStatus}>
                  {pages(
                    <PanelBoundary name="Graphics notice" fallback={null}>
                      <GraphicsPendingLink />
                    </PanelBoundary>,
                  )}
                </GraphicsDraftProvider>
              </PanelBoundary>
            </TeamsProvider>
          </LiveDataProvider>
        </main>
        <div className="pointer-events-none fixed right-4 bottom-4 z-10 flex flex-col items-end gap-2">
          <SyncIndicator />
          <SaveError />
        </div>
      </div>
    </OutputWindowProvider>
  );
}

const sidebarItem = cn(
  "flex w-full items-center gap-2.5 rounded-[7px] border-0 bg-transparent px-3 py-2 text-left no-underline",
  "font-sans text-sm font-medium tracking-normal normal-case text-dim transition-colors hover:bg-panel hover:text-soft hover:opacity-100",
  "max-[820px]:w-auto max-[820px]:px-2.5",
);

function Sidebar({
  page,
  user,
  graphicsStatus,
}: {
  page: Page;
  user: AppUser;
  graphicsStatus: { pending: boolean; unsaved: boolean };
}) {
  const graphicsFlag = graphicsStatus.unsaved
    ? { className: "bg-accent", label: "Unsaved graphics changes" }
    : graphicsStatus.pending
      ? { className: "bg-warning", label: "Graphics changes saved, not on air" }
      : null;
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
      <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2.5 max-[820px]:flex-row max-[820px]:gap-0.5 max-[820px]:overflow-x-auto max-[820px]:p-1.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5 max-[820px]:flex-row">
            <div className="px-3 pt-1 pb-0.5 font-condensed text-[10px] font-bold tracking-[0.14em] text-muted uppercase max-[820px]:hidden">
              {group.title}
            </div>
            {group.pages.map((id) => {
              const p = PAGES.find((x) => x.id === id)!;
              return (
                <a
                  key={p.id}
                  href={`#/${p.id}`}
                  aria-current={page === p.id ? "page" : undefined}
                  // The text label is hidden under 480px.
                  aria-label={p.id === "graphics" && graphicsFlag ? `${p.label} (${graphicsFlag.label})` : p.label}
                  title={p.label}
                  className={cn(
                    sidebarItem,
                    "[&>svg]:text-faint",
                    page === p.id && "bg-selected-bg text-white hover:bg-selected-bg hover:text-white [&>svg]:text-accent",
                  )}
                >
                  {p.icon}
                  <span className="whitespace-nowrap max-[480px]:hidden">{p.label}</span>
                  {p.id === "graphics" && graphicsFlag && (
                    <span
                      role="img"
                      aria-label={graphicsFlag.label}
                      title={graphicsFlag.label}
                      className={cn("ml-auto size-2 shrink-0 rounded-full max-[820px]:ml-0", graphicsFlag.className)}
                    />
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
      <OverlayLink />
      <div className="border-t border-line p-2.5 max-[820px]:border-t-0 max-[820px]:p-1.5">
        <div className="truncate px-3 pb-1.5 text-[11px] text-faint max-[820px]:hidden">Signed in as {user.label}</div>
        <button
          type="button"
          onClick={() => void store.auth.signOut()}
          aria-label="Log out"
          className={cn(sidebarItem, "hover:bg-danger-bg hover:text-danger")}
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

const FullscreenIcon = () =>
  icon(
    <>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <polyline points="21 15 21 21 15 21" />
      <polyline points="3 9 3 3 9 3" />
    </>,
  );

const ExitFullscreenIcon = () =>
  icon(
    <>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <polyline points="14 20 14 14 20 14" />
      <polyline points="10 4 10 10 4 10" />
    </>,
  );

const sidebarIconButton = cn(
  "flex size-8 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-transparent p-0 text-muted",
  "hover:bg-control hover:text-fg hover:opacity-100",
);

/** Puts the output window into fullscreen (or back); see setOutputFullscreen. */
function FullscreenButton({ output }: { output: OutputWindow }) {
  const label = output.fullscreen ? "Exit fullscreen on the output screen" : "Fullscreen on the output screen";
  return (
    <button type="button" onClick={() => setOutputFullscreen(output, !output.fullscreen)} aria-pressed={output.fullscreen}
      aria-label={label} title={label}
      className={cn(sidebarIconButton, !output.fullscreen && "border-warning text-warning")}>
      {output.fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
    </button>
  );
}

/** The output page's address and the window showing it on a projector / second screen. */
function OverlayLink() {
  const url = overlayUrl();
  const { output, screenLabel } = useOutputWindow();
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

  const on = screenLabel ? ` on ${screenLabel}` : "";
  const status = !output ? "Not open" : output.fullscreen ? `Fullscreen${on}` : `Open${on}, not fullscreen`;

  return (
    <div className="flex flex-col gap-2 border-t border-line px-[22px] py-3 max-[820px]:flex-row max-[820px]:border-t-0 max-[820px]:px-1.5">
      <div className="flex items-center justify-between font-condensed text-[10px] font-bold tracking-[0.14em] text-muted uppercase max-[820px]:hidden">
        Output
        {copied && (
          <span role="status" className="font-sans text-[11px] font-semibold tracking-normal normal-case text-success">
            Copied
          </span>
        )}
      </div>
      <div role="status" className="flex min-w-0 items-center gap-2 text-xs text-soft max-[820px]:hidden">
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full bg-faint",
            output && (output.fullscreen ? "bg-success shadow-[0_0_6px_var(--color-success)]" : "bg-warning"),
          )}
        />
        <span className="min-w-0 truncate" title={status}>
          {status}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          ref={urlRef}
          type="text"
          readOnly
          value={url}
          aria-label="Output URL"
          onFocus={(e) => e.currentTarget.select()}
          className="h-8 min-w-0 flex-1 px-2 text-[11px] text-soft max-[820px]:hidden"
        />
        <button type="button" onClick={() => void copy()} aria-label="Copy output URL" title="Copy URL" className={sidebarIconButton}>
          <CopyIcon />
        </button>
        <OpenOverlay url={url} />
        {output && <FullscreenButton output={output} />}
      </div>
    </div>
  );
}

/** The Window Management API (Chromium only; not in TypeScript's DOM lib yet). */
interface ScreenDetailed extends Screen {
  readonly availLeft: number;
  readonly availTop: number;
  readonly isPrimary: boolean;
  readonly label: string;
}
type WindowManagement = Window & { getScreenDetails?: () => Promise<{ screens: ScreenDetailed[] }> };
const canPickScreen = () =>
  typeof (window as WindowManagement).getScreenDetails === "function" &&
  (screen as Screen & { isExtended?: boolean }).isExtended === true;

const OVERLAY_WINDOW = "scoreboard-overlay";

/** Opens the output page in a window covering one screen (re-choosing moves that same window). */
function openOnScreen(url: string, s: ScreenDetailed) {
  const { availLeft: left, availTop: top, availWidth: width, availHeight: height } = s;
  const win = window.open(url, OVERLAY_WINDOW, `popup,left=${left},top=${top},width=${width},height=${height}`);
  win?.moveTo(left, top);
  win?.resizeTo(width, height);
  win?.focus();
}

/**
 * Opens the output page. With several screens (Chrome/Edge) it asks which one, opening a window
 * there; the browser asks once for "window management" permission. Otherwise a normal new tab.
 */
function OpenOverlay({ url }: { url: string }) {
  const [screens, setScreens] = useState<ScreenDetailed[] | null>(null);
  const { setScreenLabel } = useOutputWindow();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!screens) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setScreens(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setScreens(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [screens]);

  const onClick = async (e: MouseEvent) => {
    if (!canPickScreen()) return; // plain link: new tab
    e.preventDefault();
    if (screens) return setScreens(null);
    try {
      setScreens((await (window as WindowManagement).getScreenDetails!()).screens);
    } catch {
      // Permission denied: the menu still offers a new tab.
      setScreens([]);
    }
  };

  const menuItem = "block w-full rounded-sm border-0 bg-transparent px-2.5 py-2 text-left font-sans text-xs font-medium tracking-normal normal-case text-soft no-underline hover:bg-control hover:text-fg hover:opacity-100";

  return (
    <div ref={menuRef} className="relative">
      <a href={url} target="_blank" rel="noreferrer" onClick={(e) => void onClick(e)} aria-label="Open overlay"
        aria-haspopup={canPickScreen() ? "menu" : undefined} aria-expanded={screens ? true : undefined}
        title={canPickScreen() ? "Open on a screen" : "Open in a new tab"} className={sidebarIconButton}>
        <OpenIcon />
      </a>
      {screens && (
        <div role="menu"
          className={cn(
            "absolute right-0 bottom-full z-20 mb-1.5 flex w-56 flex-col gap-0.5 rounded-md border border-line-strong bg-panel p-1 shadow-lg",
            "max-[820px]:top-full max-[820px]:bottom-auto max-[820px]:mt-1.5 max-[820px]:mb-0",
          )}>
          <div className="px-2.5 pt-1.5 pb-1 text-[11px] text-faint">Open the output on</div>
          {screens.map((s, i) => (
            <button key={i} type="button" role="menuitem" className={menuItem}
              onClick={() => {
                openOnScreen(url, s);
                setScreenLabel(s.label || `Screen ${i + 1}`);
                setScreens(null);
              }}>
              {s.label || `Screen ${i + 1}`}
              <span className="ml-1.5 text-faint">
                {s.width}×{s.height}{s.isPrimary && " · main"}
              </span>
            </button>
          ))}
          <a href={url} target="_blank" rel="noreferrer" role="menuitem" className={menuItem}
            onClick={() => {
              setScreens(null);
              setScreenLabel(null);
            }}>
            New tab
          </a>
        </div>
      )}
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
