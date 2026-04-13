import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

interface KeyInfo {
  key: string;
  code: string;
  keyCode: number;
  which: number;
  charCode: number;
  location: number;
  repeat: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  type: string;
}

function displayLabel(key: string): string {
  if (key === " ") return "Space";
  if (key === "ArrowUp") return "↑";
  if (key === "ArrowDown") return "↓";
  if (key === "ArrowLeft") return "←";
  if (key === "ArrowRight") return "→";
  if (key === "Enter") return "↵ Enter";
  if (key === "Backspace") return "⌫ Backspace";
  if (key === "Escape") return "Esc";
  if (key === "Tab") return "⇥ Tab";
  if (key === "CapsLock") return "⇪ Caps Lock";
  return key;
}

function locationLabel(location: number): string {
  switch (location) {
    case 0: return "0 · Standard";
    case 1: return "1 · Left";
    case 2: return "2 · Right";
    case 3: return "3 · Numpad";
    default: return `${location}`;
  }
}

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

function PropCard({
  label,
  value,
  tooltip,
  badge,
}: {
  label: string;
  value: string;
  tooltip?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div
      title={tooltip}
      className="rounded-lg border border-border-light bg-white px-3 py-2 dark:border-border-dark dark:bg-panel-dark"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </div>
      {badge ?? (
        <div className="mt-0.5 break-all font-mono text-sm text-slate-800 dark:text-slate-200">
          {value}
        </div>
      )}
    </div>
  );
}

function KeycodeInfoTool() {
  const [current, setCurrent] = useState<KeyInfo | null>(null);

  const [focused, setFocused] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const info: KeyInfo = {
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      which: e.which,
      charCode: e.charCode,
      location: e.location,
      repeat: e.repeat,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      type: e.type,
    };
    setCurrent(info);
  }, []);

  useEffect(() => {
    captureRef.current?.focus();
  }, []);

  const showUnicode = current !== null && current.key.length === 1;
  const codePoint = showUnicode ? current!.key.codePointAt(0)! : 0;
  const codePointHex = showUnicode
    ? codePoint.toString(16).toUpperCase().padStart(4, "0")
    : "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">

      {/* ── Capture zone ── */}
      <div
        ref={captureRef}
        role="application"
        aria-label="Keyboard capture zone"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={() => captureRef.current?.focus()}
        className={`relative mx-4 mt-4 flex h-[40%] max-h-[280px] min-h-[160px] shrink-0 cursor-default flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-light bg-panel-light/40 px-4 outline-none transition-shadow dark:border-border-dark dark:bg-panel-dark/40 ${
          focused ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark" : ""
        }`}
      >
        {!focused && (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center rounded-xl bg-slate-900/5 text-xs text-slate-500 backdrop-blur-[1px] dark:bg-slate-950/30 dark:text-slate-400">
            Click to resume
          </div>
        )}
        {current === null ? (
          <>
            <span className="material-symbols-outlined mb-2 text-4xl text-slate-400 dark:text-slate-500">keyboard</span>
            <p className="text-sm font-medium">Press any key</p>
            <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
              Click here first if keys aren&apos;t registering
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 min-w-[72px] items-center justify-center rounded-xl border-2 border-b-4 border-slate-300 bg-white px-4 text-xl font-bold text-slate-800 shadow-sm dark:border-slate-600 dark:border-b-slate-500 dark:bg-slate-700 dark:text-slate-100">
              {displayLabel(current.key)}
            </div>
            <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {current.keyCode} · {current.code} · {current.key}
            </p>
          </div>
        )}
      </div>

      {/* ── Two-column body ── */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-border-light p-4 dark:border-border-dark">
        <div className="grid min-h-full grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">

          {/* Left: Key Properties */}
          <div className="flex flex-col">
            <SectionLabel>Key Properties</SectionLabel>
            {current ? (
              <div className="grid grid-cols-2 gap-2">
                <PropCard label="key" value={current.key} tooltip="Human-readable key name" />
                <PropCard label="code" value={current.code} tooltip="Physical key position, layout-independent" />
                <PropCard label="keyCode" value={String(current.keyCode)} tooltip="Deprecated but widely supported numeric key identifier" />
                <PropCard label="which" value={String(current.which)} tooltip="Legacy alias for keyCode" />
                <PropCard
                  label="charCode"
                  value={String(current.charCode)}
                  tooltip="Deprecated — always 0 in modern browsers on all event types"
                  badge={
                    <div className="mt-0.5">
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                        {current.charCode}
                      </span>
                      <span className="ml-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                        deprecated
                      </span>
                    </div>
                  }
                />
                <PropCard label="location" value={locationLabel(current.location)} tooltip="0 Standard · 1 Left · 2 Right · 3 Numpad" />
                <PropCard
                  label="repeat"
                  value={String(current.repeat)}
                  tooltip="True while the key is held down after the initial press"
                  badge={
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-xs ${
                      current.repeat
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {String(current.repeat)}
                    </span>
                  }
                />
                <PropCard label="type" value={current.type} tooltip="DOM event type" />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border-light py-8 text-center text-sm text-slate-400 dark:border-border-dark dark:text-slate-500">
                Press a key to see its properties
              </div>
            )}
          </div>

          {/* Right: Modifiers + Unicode + History */}
          <div className="flex min-w-0 flex-col gap-5 lg:border-l lg:border-border-light lg:pl-4 lg:dark:border-border-dark">

            {/* Modifiers */}
            <div>
              <SectionLabel>Modifiers</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["shiftKey", "Shift"],
                    ["ctrlKey", "Ctrl"],
                    ["altKey", "Alt"],
                    ["metaKey", isApplePlatform() ? "⌘ Meta" : "Meta"],
                  ] as const
                ).map(([k, name]) => (
                  <span
                    key={k}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      current?.[k]
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Unicode — always rendered to keep column height stable */}
            <div>
              <SectionLabel>Unicode</SectionLabel>
              <div className="grid grid-cols-3 divide-x divide-border-light overflow-hidden rounded-lg border border-border-light bg-white dark:divide-border-dark dark:border-border-dark dark:bg-panel-dark">
                {[
                  { label: "codepoint", value: showUnicode ? `U+${codePointHex}` : "—" },
                  { label: "decimal",   value: showUnicode ? String(codePoint) : "—" },
                  { label: "char",      value: showUnicode && current ? current.key : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
                    <div className={`font-mono leading-none text-slate-800 dark:text-slate-200 whitespace-pre min-h-[2.25rem] ${label === "char" && showUnicode ? "text-3xl" : "text-sm"}`}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}

export default KeycodeInfoTool;
