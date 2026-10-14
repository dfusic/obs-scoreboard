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
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant: ButtonVariant }) {
  return <button type={type} className={cn(BUTTON_VARIANTS[variant], className)} {...rest} />;
}

// ---------- inputs ----------

/**
 * A field showing a stored value that saves on `change` (blur or Enter, or closing a
 * colour picker), not per keystroke. New values from snapshots don't overwrite what
 * the operator is typing. Give it a `key` per record so switching records resets it.
 */
export function CommitInput({
  value,
  onCommit,
  ref,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
  ref?: Ref<HTMLInputElement>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    const input = inputRef.current!;
    if (document.activeElement !== input && input.value !== value) input.value = value;
  }, [value]);

  // React's onChange fires per keystroke; the native change event is the "done editing" one.
  useEffect(() => {
    const input = inputRef.current!;
    const onChange = () => onCommitRef.current(input.value);
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
 * fresh data and stay usable on air.
 */
export class PanelBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(`${this.props.name} panel failed:`, err, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
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
