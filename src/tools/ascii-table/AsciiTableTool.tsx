import { useMemo, useState, type ReactNode } from "react";
import { CopyButton } from "../../components/tool";
import { CHAR_DATA, type CharBlock, type CharEntry } from "./data";

const BLOCK_PILLS: Array<{ id: CharBlock | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "control", label: "Control" },
  { id: "ascii-printable", label: "ASCII" },
  { id: "latin-supplement", label: "Latin" },
  { id: "currency", label: "Currency" },
  { id: "math", label: "Math" },
  { id: "arrows", label: "Arrows" },
  { id: "box-drawing", label: "Box Drawing" },
  { id: "block-elements", label: "Blocks" },
  { id: "geometric", label: "Geometric" },
  { id: "misc-symbols", label: "Symbols" },
  { id: "emoji", label: "Emoji" },
];

const BLOCK_LABELS: Record<CharBlock, string> = {
  control: "Control",
  "ascii-printable": "ASCII Printable",
  "latin-supplement": "Latin-1 Supplement",
  currency: "Currency",
  math: "Math",
  arrows: "Arrows",
  "box-drawing": "Box Drawing",
  "block-elements": "Block Elements",
  geometric: "Geometric",
  "misc-symbols": "Misc Symbols",
  emoji: "Emoji",
};

const BLOCK_ORDER: CharBlock[] = [
  "control",
  "ascii-printable",
  "latin-supplement",
  "currency",
  "math",
  "arrows",
  "box-drawing",
  "block-elements",
  "geometric",
  "misc-symbols",
  "emoji",
];

const HTML_ENTITY_BY_CP: Record<number, string> = {
  34: "&quot;",
  38: "&amp;",
  39: "&apos;",
  60: "&lt;",
  62: "&gt;",
  160: "&nbsp;",
  162: "&cent;",
  163: "&pound;",
  165: "&yen;",
  167: "&sect;",
  169: "&copy;",
  174: "&reg;",
  176: "&deg;",
  177: "&plusmn;",
  182: "&para;",
  215: "&times;",
  247: "&divide;",
  8230: "&hellip;",
  8211: "&ndash;",
  8212: "&mdash;",
  8364: "&euro;",
  8734: "&infin;",
  8482: "&trade;",
  171: "&laquo;",
  187: "&raquo;",
};

function OptionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border-light text-slate-500 hover:bg-slate-100 dark:border-border-dark dark:text-slate-400 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function toUtf8Hex(cp: number): string {
  const bytes = new TextEncoder().encode(String.fromCodePoint(cp));
  return Array.from(bytes)
    .map((b) => `0x${b.toString(16).toUpperCase().padStart(2, "0")}`)
    .join(" ");
}

function toJsEscape(cp: number): string {
  if (cp <= 0xffff) return `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`;
  return `\\u{${cp.toString(16).toUpperCase()}}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-light bg-panel-light px-3 py-2 dark:border-border-dark dark:bg-panel-dark">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 break-all font-mono text-sm text-slate-800 dark:text-slate-200">{value}</div>
    </div>
  );
}

function DetailPanel({ entry, onClose }: { entry: CharEntry; onClose: () => void }) {
  const hex = `0x${entry.cp.toString(16).toUpperCase()}`;
  const uCode = `U+${entry.cp.toString(16).toUpperCase().padStart(4, "0")}`;
  const jsEscape = toJsEscape(entry.cp);
  const htmlEntity = HTML_ENTITY_BY_CP[entry.cp];
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Character details
          </div>
          <div className="mt-2 flex h-16 w-16 items-center justify-center rounded-lg border border-border-light bg-panel-light text-3xl dark:border-border-dark dark:bg-panel-dark">
            {entry.ch || entry.abbr || "?"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border-light px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-border-dark dark:text-slate-400 dark:hover:bg-panel-dark"
        >
          Close
        </button>
      </div>
      <DetailRow label="Name" value={entry.name} />
      <DetailRow label="Codepoint" value={uCode} />
      <DetailRow label="Decimal" value={String(entry.cp)} />
      <DetailRow label="Hex" value={hex} />
      <DetailRow label="UTF-8" value={toUtf8Hex(entry.cp)} />
      <DetailRow label="JS escape" value={jsEscape} />
      {htmlEntity ? <DetailRow label="HTML entity" value={htmlEntity} /> : null}
      <div className="flex flex-wrap gap-2">
        {entry.ch ? <CopyButton value={entry.ch} label="Copy char" className="text-xs" /> : null}
        <CopyButton value={uCode} label="Copy U+" className="text-xs" />
        <CopyButton value={hex} label="Copy hex" className="text-xs" />
        <CopyButton value={jsEscape} label="Copy JS" className="text-xs" />
        {htmlEntity ? <CopyButton value={htmlEntity} label="Copy entity" className="text-xs" /> : null}
      </div>
    </div>
  );
}

export default function AsciiTableTool() {
  const [query, setQuery] = useState("");
  const [blockFilter, setBlockFilter] = useState<CharBlock | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<CharEntry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHAR_DATA.filter((e) => {
      const matchesBlock = blockFilter === "all" || e.block === blockFilter;
      if (!matchesBlock) return false;
      if (!q) return true;
      const normalized = q.replace(/^u\+/, "");
      const cpHex = e.cp.toString(16).padStart(4, "0");
      const cpDec = String(e.cp);
      if (normalized === cpHex || normalized === cpDec) return true;
      if (q === `0x${cpHex}`) return true;
      if (e.ch && e.ch.toLowerCase() === q) return true;
      return e.name.toLowerCase().includes(q) || (e.abbr ? e.abbr.toLowerCase().includes(q) : false);
    });
  }, [query, blockFilter]);

  const effectiveView = query.trim() ? "list" : view;
  const sections = useMemo(() => {
    if (blockFilter !== "all" || effectiveView !== "grid") return null;
    return BLOCK_ORDER.map((block) => ({
      block,
      items: filtered.filter((e) => e.block === block),
    })).filter((s) => s.items.length > 0);
  }, [filtered, blockFilter, effectiveView]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="sticky top-0 z-10 shrink-0 border-b border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by character, U+0041, 0x41, 65, name, or abbr..."
              className="min-w-0 flex-1 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm dark:border-border-dark dark:bg-background-dark"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`rounded-md px-2 py-1 text-xs ${view === "grid" ? "bg-primary/15 text-primary" : "bg-slate-100 text-slate-500 dark:bg-panel-dark dark:text-slate-400"}`}
              >
                ⊞ Grid
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-md px-2 py-1 text-xs ${view === "list" ? "bg-primary/15 text-primary" : "bg-slate-100 text-slate-500 dark:bg-panel-dark dark:text-slate-400"}`}
              >
                ☰ List
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {BLOCK_PILLS.map((p) => (
              <OptionPill key={p.id} active={blockFilter === p.id} onClick={() => setBlockFilter(p.id)}>
                {p.label}
              </OptionPill>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No characters match your filters.
            </div>
          ) : effectiveView === "grid" ? (
            sections ? (
              <div className="flex flex-wrap gap-1 p-3">
                {sections.map(({ block, items }) => (
                  <div key={block} className="contents">
                    <div className="w-full px-1 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {BLOCK_LABELS[block]}
                    </div>
                    {items.map((e) => (
                      <button
                        key={e.cp}
                        onClick={() => setSelected(e)}
                        title={e.name}
                        className={`group flex h-16 w-16 flex-col items-center justify-center rounded-lg border transition-colors hover:border-primary/40 hover:bg-primary/5 ${
                          selected?.cp === e.cp
                            ? "border-primary/50 bg-primary/10"
                            : "border-border-light dark:border-border-dark"
                        }`}
                      >
                        {e.ch ? (
                          <span className="text-xl leading-none text-slate-800 dark:text-slate-200">{e.ch}</span>
                        ) : (
                          <span className="text-[11px] font-mono font-semibold text-slate-400 dark:text-slate-500">{e.abbr}</span>
                        )}
                        <span className="mt-1 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                          {e.cp.toString(16).toUpperCase().padStart(4, "0")}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 p-3">
                {filtered.map((e) => (
                  <button
                    key={e.cp}
                    onClick={() => setSelected(e)}
                    title={e.name}
                    className={`group flex h-16 w-16 flex-col items-center justify-center rounded-lg border transition-colors hover:border-primary/40 hover:bg-primary/5 ${
                      selected?.cp === e.cp
                        ? "border-primary/50 bg-primary/10"
                        : "border-border-light dark:border-border-dark"
                    }`}
                  >
                    {e.ch ? (
                      <span className="text-xl leading-none text-slate-800 dark:text-slate-200">{e.ch}</span>
                    ) : (
                      <span className="text-[11px] font-mono font-semibold text-slate-400 dark:text-slate-500">{e.abbr}</span>
                    )}
                    <span className="mt-1 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                      {e.cp.toString(16).toUpperCase().padStart(4, "0")}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <>
              <div className="sticky top-0 z-[1] flex border-b border-border-light bg-panel-light/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:border-border-dark dark:bg-panel-dark/95">
                <span className="w-12 shrink-0">Char</span>
                <span className="w-20 shrink-0">U+Code</span>
                <span className="hidden w-10 shrink-0 sm:block">Dec</span>
                <span className="flex-1">Name</span>
                <span className="w-8 shrink-0" aria-hidden />
              </div>
              {filtered.map((e) => (
                <div
                  key={e.cp}
                  className={`group flex cursor-pointer items-center gap-3 border-b border-border-light/60 px-4 py-2 transition-colors hover:bg-slate-50 dark:border-border-dark/60 dark:hover:bg-panel-dark/60 ${
                    selected?.cp === e.cp ? "bg-primary/5" : ""
                  }`}
                  onClick={() => setSelected(e)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-light bg-panel-light font-mono text-lg dark:border-border-dark dark:bg-panel-dark">
                    {e.ch || <span className="text-[10px] font-semibold text-slate-400">{e.abbr}</span>}
                  </span>
                  <span className="w-20 shrink-0 font-mono text-xs text-slate-500">
                    U+{e.cp.toString(16).toUpperCase().padStart(4, "0")}
                  </span>
                  <span className="hidden w-10 shrink-0 font-mono text-xs text-slate-400 sm:block">{e.cp}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{e.name}</span>
                  <CopyButton value={e.ch || e.abbr || ""} variant="icon" className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))}
            </>
          )}
        </div>

        {selected ? (
          <div className="hidden w-72 shrink-0 border-l border-border-light overflow-y-auto dark:border-border-dark lg:flex lg:flex-col">
            <DetailPanel entry={selected} onClose={() => setSelected(null)} />
          </div>
        ) : null}
      </div>

      {selected ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark lg:hidden"
          style={{ maxHeight: "280px" }}
        >
          <DetailPanel entry={selected} onClose={() => setSelected(null)} />
        </div>
      ) : null}

      <div className="shrink-0 border-t border-border-light px-4 py-2 text-xs text-slate-400 dark:border-border-dark dark:text-slate-500">
        {filtered.length} of {CHAR_DATA.length} characters {selected ? `· ${selected.name}` : ""}
      </div>
    </div>
  );
}
