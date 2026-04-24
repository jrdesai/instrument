import { useEffect } from "react";

const kbdClass =
  "font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded";

function Chord({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="text-slate-400 dark:text-slate-500">+</span>}
          <kbd className={kbdClass}>{k}</kbd>
        </span>
      ))}
    </span>
  );
}

const navigationRows: { label: string; mac: string[]; win: string[] }[] = [
  { label: "Search tools", mac: ["⌘", "K"], win: ["Ctrl", "K"] },
  { label: "Home", mac: ["⌘", "1"], win: ["Ctrl", "1"] },
  { label: "History", mac: ["⌘", "2"], win: ["Ctrl", "2"] },
  { label: "Settings", mac: ["⌘", "3"], win: ["Ctrl", "3"] },
  { label: "Keyboard shortcuts", mac: ["⌘", "/"], win: ["Ctrl", "/"] },
];

const toolsRows: { label: string; mac: string[]; win: string[] }[] = [
  { label: "Favourite / unfavourite tool", mac: ["⌘", "⇧", "F"], win: ["Ctrl", "Shift", "F"] },
];

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ShortcutTable({ rows }: { rows: { label: string; mac: string[]; win: string[] }[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 text-sm text-slate-700 dark:text-slate-300"
        >
          <span className="min-w-0">{row.label}</span>
          <Chord keys={row.mac} />
          <Chord keys={row.win} />
        </div>
      ))}
    </div>
  );
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" aria-hidden />
      <div
        className="relative w-full max-w-lg mx-4 bg-panel-light dark:bg-panel-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden"
        role="dialog"
        aria-modal
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-border-dark">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="max-h-[min(70vh,32rem)] overflow-y-auto custom-scrollbar px-4 py-4 space-y-6">
          <section>
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Navigation
            </h3>
            <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span />
              <span>Mac</span>
              <span>Win / Linux</span>
            </div>
            <ShortcutTable rows={navigationRows} />
          </section>

          <section>
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Tools
            </h3>
            <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span />
              <span>Mac</span>
              <span>Win / Linux</span>
            </div>
            <ShortcutTable rows={toolsRows} />
          </section>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 dark:border-border-dark">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
            All tool processing runs locally. No data leaves your device.
          </p>
        </div>
      </div>
    </div>
  );
}
