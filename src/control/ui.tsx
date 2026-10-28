import {
  Component,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type ErrorInfo,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { twMerge } from "tailwind-merge";
import { processImage, type ImageKind } from "./images";

export const cn = twMerge;

// ---------- layout ----------

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-md border border-line bg-panel", className)}>{children}</div>;
}

export function PanelTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line px-[18px] pt-3.5 pb-2.5",
        "font-condensed text-[11px] font-bold tracking-[0.12em] text-dim uppercase",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-col gap-3.5 px-[18px] py-4", className)}>{children}</div>;
}

/** A page's title bar: heading and subtitle on the left, `children` (actions, status) on the right. */
export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-6 py-4 max-[480px]:px-4">
      <div className="min-w-0">
        <h1 className="m-0 font-condensed text-2xl leading-tight font-black tracking-[0.04em] text-white uppercase">
          {title}
        </h1>
        {sub && <p className="m-0 mt-0.5 text-[13px] text-dim">{sub}</p>}
      </div>
      <Spacer />
      {children}
    </header>
  );
}

export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-col gap-4 px-6 py-5 max-[480px]:px-4", className)}>{children}</div>;
}

export function Row({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

export const Spacer = () => <div className="grow" />;

export function Field({ label, htmlFor, children }: { label: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium tracking-[0.04em] text-dim">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Hint({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("m-0 text-xs text-dim", className)}>{children}</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <span role="alert" className="text-[0.85rem] text-danger">
      {children}
    </span>
  );
}

// ---------- buttons ----------

const BUTTON_VARIANTS = {
  start: "h-[52px] min-w-[130px] bg-success px-7 text-[15px] text-black",
  end: "h-[52px] min-w-[130px] bg-danger px-7 text-[15px] text-white",
  primary: "inline-flex h-10 items-center gap-[7px] bg-accent px-[18px] text-[13px] text-white",
  ghost: "h-9 border border-line-strong bg-transparent px-4 text-xs text-muted hover:bg-control hover:opacity-100",
  danger:
    "h-11 border border-line-strong bg-transparent px-4 text-[13px] text-danger hover:bg-danger hover:text-white hover:opacity-100",
  wide: "h-11 w-full border border-line-strong bg-control text-[13px] text-soft",
  small: "h-7 border border-line-strong bg-control px-3 text-[11px] text-soft",
  scene: "h-11 border border-line-strong bg-control px-3 text-[13px] text-soft",
  goal: "h-11 bg-danger text-[15px] text-white",
  score:
    "flex size-11 items-center justify-center border border-line-strong bg-control p-0 text-[22px] leading-none text-fg hover:bg-control-hover hover:opacity-100",
  tab: "h-[30px] border border-line-strong bg-transparent px-3 text-xs text-muted",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

/** On-air state of a scene button (red, like a tally light). */
export const ON_AIR = "border-danger bg-danger text-white";
/** Square icon button, combined with a variant. */
export const ICON = "w-9 p-0 text-lg";

export function Button({
  variant,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant: ButtonVariant; ref?: Ref<HTMLButtonElement> }) {
  return <button type={type} className={cn(BUTTON_VARIANTS[variant], className)} {...rest} />;
}

// ---------- inputs ----------

/**
 * A field showing a stored value that saves on `change` (blur or Enter, or closing a
 * colour picker), not per keystroke. New values from snapshots don't overwrite what
 * the operator is typing. Give it a `key` per record so switching records resets it.
 * `onCommit` returning `false` rejects the value (e.g. an empty name): the field goes back
 * to the stored `value`.
 */
export function CommitInput({
  value,
  onCommit,
  ref,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & {
  value: string;
  onCommit: (value: string) => boolean | void;
  ref?: Ref<HTMLInputElement>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const input = inputRef.current!;
    if (document.activeElement !== input && input.value !== value) input.value = value;
  }, [value]);

  // React's onChange fires per keystroke; the native change event is the "done editing" one.
  useEffect(() => {
    const input = inputRef.current!;
    const onChange = () => {
      if (onCommitRef.current(input.value) === false) input.value = valueRef.current;
    };
    input.addEventListener("change", onChange);
    return () => input.removeEventListener("change", onChange);
  }, []);

  return (
    <input
      ref={(el) => {
        inputRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      defaultValue={value}
      {...rest}
    />
  );
}

// ---------- images ----------

export const ImageIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/** An image, or the placeholder icon when there is none. */
export function Thumb({ url, className, iconSize }: { url: string | null; className?: string; iconSize?: number }) {
  return url ? <img src={url} alt="" className={className} /> : <ImageIcon size={iconSize} />;
}

/**
 * Resizes a chosen image and passes the data URL to `save`. `status` is progress or
 * the error, for the caller to show.
 */
export function useImageUpload(kind: ImageKind, save: (dataUrl: string) => Promise<void>) {
  const [status, setStatus] = useState<string | null>(null);
  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setStatus("Processing...");
    try {
      const dataUrl = await processImage(file, kind);
      // Not awaited past the local write: offline, the save only settles on reconnect.
      void save(dataUrl);
      setStatus(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not process image");
    } finally {
      input.value = "";
    }
  };
  return { onChange, status };
}

/** File input hidden inside a label, so the label is the button. */
export const hiddenFileInput = "pointer-events-none absolute size-px opacity-0";

export function UploadButton({
  children,
  onChange,
  accept = "image/*",
  multiple,
}: {
  children: ReactNode;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  multiple?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong bg-control px-3.5",
        "font-condensed text-xs font-bold tracking-[0.08em] text-muted uppercase",
        "hover:border-line-hover hover:text-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
      )}
    >
      <UploadIcon /> {children}
      <input type="file" accept={accept} multiple={multiple} onChange={onChange} className={hiddenFileInput} />
    </label>
  );
}

// ---------- errors ----------

/**
 * Keeps one failing panel from taking the dashboard down: the others keep getting
 * fresh data and stay usable on air. `fallback` replaces the error panel (e.g. `null` for
 * a small notice, or a degraded version of the content).
 */
export class PanelBoundary extends Component<
  { name: string; fallback?: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(`${this.props.name} panel failed:`, err, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <Panel>
        <PanelTitle>{this.props.name}</PanelTitle>
        <PanelBody>
          <ErrorText>This panel failed. The rest of the dashboard still works.</ErrorText>
          <Button variant="ghost" onClick={() => this.setState({ failed: false })}>
            Try again
          </Button>
        </PanelBody>
      </Panel>
    );
  }
}

// ---------- overlays ----------

/**
 * A small panel anchored to its trigger (place both in a `relative` wrapper and position the
 * panel with `className`, e.g. `top-full right-0 mt-1.5`). Closes on Esc and on a click
 * outside it (`ignore`: an element whose clicks don't count as outside, usually the trigger,
 * which toggles it itself). Focuses its first field or button when it opens and gives focus
 * back to what had it when it closes.
 */
export function Popover({
  open,
  onClose,
  ignore,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ignore?: { current: HTMLElement | null };
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current!;
    panel.querySelector<HTMLElement>("input, button:not(:disabled), select")?.focus();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.contains(target) && !ignore?.current?.contains(target)) onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onCloseRef.current();
    };
    // Pages stay mounted when hidden: a popover left open there would still count as open.
    const onHash = () => onCloseRef.current();
    document.addEventListener("pointerdown", onPointer);
    panel.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      panel.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
      // Back to the trigger, unless the operator has clicked somewhere else meanwhile.
      if (panel.contains(document.activeElement) || document.activeElement === document.body) previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      className={cn(
        "absolute z-30 flex flex-col gap-2.5 rounded-md border border-line-strong bg-panel p-3 shadow-[0_12px_32px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A modal on the native <dialog> (focus trap, Esc to close and focus return from the browser).
 * Rendered only while `open`; Esc, a click on the backdrop (pressed there too, so a drag
 * out of a field doesn't close it), the close button and a page switch call `onClose`.
 */
export function Dialog({
  open,
  onClose,
  title,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  /** Whether the current click started on the backdrop. */
  const downOnBackdrop = useRef(false);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    // Pages stay mounted when hidden: a modal left open on a hidden page would make the
    // whole document inert, so a page switch closes it.
    const onHash = () => onCloseRef.current();
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      if (dialog.open) dialog.close();
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        const fromBackdrop = downOnBackdrop.current;
        downOnBackdrop.current = false;
        if (fromBackdrop && e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-auto max-h-[calc(100vh-48px)] w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-md border border-line-strong bg-panel p-0 text-fg",
        "backdrop:bg-black/70",
        className,
      )}
    >
      <div className="flex max-h-[calc(100vh-48px)] flex-col">
        <PanelTitle className="text-xs">
          {title}
          <Spacer />
          <Button variant="ghost" className={cn(ICON, "size-8 text-base")} aria-label="Close" onClick={onClose}>
            ✕
          </Button>
        </PanelTitle>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}

// ---------- lists: toolbars, chips, badges, pagination ----------

/** A search field with a magnifier icon; `onChange` gets the text per keystroke (local filtering only). */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-[180px]", className)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dim">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && value && (e.stopPropagation(), onChange(""))}
        className="h-9 w-full rounded-sm border border-line-strong bg-well pr-3 pl-8 font-sans text-sm text-fg"
      />
    </div>
  );
}

/** A filter chip (toggle button) with an optional count. */
export function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-transparent px-3 text-[11px] text-muted",
        "hover:bg-control hover:opacity-100",
        active && "border-accent bg-accent/15 text-fg hover:bg-accent/20",
      )}
    >
      {children}
      {count !== undefined && <span className={cn("tabular-nums text-dim", active && "text-soft")}>{count}</span>}
    </button>
  );
}

const BADGE_TONES = {
  neutral: "border-line-strong text-muted",
  accent: "border-accent/60 bg-accent/15 text-accent-text",
  warning: "border-warning/50 bg-warning/10 text-warning",
  danger: "border-danger/50 bg-danger/10 text-danger-text",
} as const;

/** A small status label. */
export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof BADGE_TONES; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 font-condensed text-[10px] font-bold tracking-[0.08em] whitespace-nowrap uppercase",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A button-looking label around a hidden file input (e.g. a primary "Add logos" action). */
export function FileButton({
  variant,
  className,
  accept = "image/*",
  multiple,
  onChange,
  children,
}: {
  variant: ButtonVariant;
  className?: string;
  accept?: string;
  multiple?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center rounded-sm font-condensed font-bold tracking-[0.08em] uppercase",
        BUTTON_VARIANTS[variant],
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
        className,
      )}
    >
      {children}
      <input type="file" accept={accept} multiple={multiple} onChange={onChange} className={hiddenFileInput} />
    </label>
  );
}

/** Two or more mutually exclusive options shown as joined buttons. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { id: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-sm border border-line-strong p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-7 bg-transparent px-3 text-[11px] text-muted hover:opacity-100 hover:text-soft",
            value === o.id && "bg-control text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Which page numbers to show: all when few, else the first, last and those around `page` (null = gap). */
export function pageNumbers(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
  const shown = [...new Set([0, pageCount - 1, page - 1, page, page + 1])]
    .filter((p) => p >= 0 && p < pageCount)
    .sort((a, b) => a - b);
  const out: (number | null)[] = [];
  shown.forEach((p, i) => {
    if (i > 0 && p - shown[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

/** "1–25 of 48" with prev / page numbers / next. `page` is 0-based. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center gap-1.5">
      <span className="mr-auto text-xs text-dim tabular-nums">
        {from}–{to} of {total}
      </span>
      {pageCount > 1 && (
        <>
          <Button variant="small" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}>
            ‹
          </Button>
          {pageNumbers(page, pageCount).map((p, i) =>
            p === null ? (
              <span key={`gap${i}`} className="px-1 text-dim">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant="small"
                aria-current={p === page ? "page" : undefined}
                className={cn("min-w-7 px-2 tabular-nums", p === page && "border-accent bg-accent text-white")}
                onClick={() => onPage(p)}
              >
                {p + 1}
              </Button>
            ),
          )}
          <Button variant="small" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>
            ›
          </Button>
        </>
      )}
    </nav>
  );
}

/** Reads a per-viewer preference from localStorage (blocked storage = the fallback). */
export function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private window or blocked storage: the choice just isn't remembered.
  }
}
