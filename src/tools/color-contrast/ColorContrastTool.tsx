import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import { callTool } from "../../bridge";
import { extractErrorMessage } from "../../lib/extractErrorMessage";
import type { ColorContrastOutput } from "../../bindings/ColorContrastOutput";

const TOOL_ID = "color-contrast";
const RUST_COMMAND = "tool_color_contrast_process";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const DEFAULT_FG = "#000000";
const DEFAULT_BG = "#FFFFFF";

/** Ensure a string is a valid 6-digit hex, returning it or a fallback. */
function normaliseHex(val: string, fallback: string): string {
  const cleaned = val.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(cleaned) ? `#${cleaned.toUpperCase()}` : fallback;
}

/** Return black or white depending on which contrasts better against `hex`. */
function labelColour(hex: string): string {
  if (hex.length < 7 || !hex.startsWith("#")) return "#000000";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#000000";
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 128 ? "#000000" : "#FFFFFF";
}

function WcagBadge({
  label,
  sublabel,
  pass,
}: {
  label: string;
  sublabel: string;
  pass: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-4 ${
        pass
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
      }`}
    >
      <span
        className={`text-lg font-bold ${
          pass
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {pass ? "✓ Pass" : "✗ Fail"}
      </span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</span>
    </div>
  );
}

function ColourCard({
  label,
  colour,
  textValue,
  onPickerChange,
  onTextChange,
  inputId,
}: {
  label: string;
  colour: string;
  textValue: string;
  onPickerChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTextChange: (e: ChangeEvent<HTMLInputElement>) => void;
  inputId: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <label
        htmlFor={inputId}
        className="relative h-24 w-full cursor-pointer overflow-hidden rounded-xl border-2 border-slate-200 shadow-sm transition hover:border-primary dark:border-slate-700"
        style={{ backgroundColor: colour }}
        title="Click to open colour picker"
      >
        <input
          id={inputId}
          type="color"
          value={colour}
          onChange={onPickerChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <span
          className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 font-mono text-xs font-semibold"
          style={{
            backgroundColor: `${labelColour(colour)}22`,
            color: labelColour(colour),
          }}
        >
          {colour.toUpperCase()}
        </span>
      </label>
      <input
        type="text"
        value={textValue}
        onChange={onTextChange}
        maxLength={7}
        placeholder="#RRGGBB"
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-center font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        aria-label={`${label} hex value`}
      />
    </div>
  );
}

export default function ColorContrastTool() {
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);
  const { setDraft } = useDraftInput(TOOL_ID);

  const [fg, setFg] = useState(DEFAULT_FG);
  const [bg, setBg] = useState(DEFAULT_BG);
  const [fgText, setFgText] = useState(DEFAULT_FG);
  const [bgText, setBgText] = useState(DEFAULT_BG);

  const [result, setResult] = useState<ColorContrastOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const computeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const compute = useCallback(
    (foreground: string, background: string) => {
      if (computeDebounceRef.current) clearTimeout(computeDebounceRef.current);
      computeDebounceRef.current = setTimeout(() => {
        void (async () => {
          setIsLoading(true);
          try {
            const res = (await callTool(
              RUST_COMMAND,
              { foreground, background },
              { skipHistory: true }
            )) as ColorContrastOutput;
            if (res.error) {
              setError(res.error);
              setResult(null);
            } else {
              setError(null);
              setResult(res);
              setFgText(res.foregroundHex);
              setBgText(res.backgroundHex);
              if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
              historyDebounceRef.current = setTimeout(() => {
                addHistoryEntry(TOOL_ID, {
                  input: { foreground, background },
                  output: { ratioDisplay: res.ratioDisplay },
                  timestamp: Date.now(),
                });
                historyDebounceRef.current = null;
              }, HISTORY_DEBOUNCE_MS);
            }
          } catch (err) {
            setError(extractErrorMessage(err, "Contrast check failed"));
            setResult(null);
          } finally {
            setIsLoading(false);
          }
        })();
      }, DEBOUNCE_MS);
    },
    [addHistoryEntry]
  );

  useRestoreDraft(TOOL_ID, (raw) => {
    if (raw && typeof raw === "object") {
      const d = raw as { fg?: string; bg?: string };
      const restoredFg = d.fg ?? DEFAULT_FG;
      const restoredBg = d.bg ?? DEFAULT_BG;
      setFg(restoredFg);
      setFgText(restoredFg.toUpperCase());
      setBg(restoredBg);
      setBgText(restoredBg.toUpperCase());
      compute(restoredFg, restoredBg);
    } else {
      compute(DEFAULT_FG, DEFAULT_BG);
    }
  });

  useEffect(() => {
    return () => {
      if (computeDebounceRef.current) clearTimeout(computeDebounceRef.current);
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleFgPicker = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFg(v);
    setFgText(v.toUpperCase());
    setDraft({ fg: v, bg });
    compute(v, bg);
  };

  const handleFgText = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFgText(v);
    const normalised = normaliseHex(v, fg);
    if (normalised !== fg) {
      setFg(normalised);
      setDraft({ fg: normalised, bg });
      compute(normalised, bg);
    }
  };

  const handleBgPicker = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setBg(v);
    setBgText(v.toUpperCase());
    setDraft({ fg, bg: v });
    compute(fg, v);
  };

  const handleBgText = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setBgText(v);
    const normalised = normaliseHex(v, bg);
    if (normalised !== bg) {
      setBg(normalised);
      setDraft({ fg, bg: normalised });
      compute(fg, normalised);
    }
  };

  const handleSwap = () => {
    const newFg = bg;
    const newBg = fg;
    setFg(newFg);
    setBg(newBg);
    setFgText(newFg.toUpperCase());
    setBgText(newBg.toUpperCase());
    setDraft({ fg: newFg, bg: newBg });
    compute(newFg, newBg);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-lg space-y-6 p-6">
        <div className="flex items-start gap-4">
          <ColourCard
            label="Foreground"
            colour={fg}
            textValue={fgText}
            onPickerChange={handleFgPicker}
            onTextChange={handleFgText}
            inputId="cc-fg-picker"
          />

          <button
            type="button"
            onClick={handleSwap}
            className="mt-10 shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Swap colours"
            aria-label="Swap foreground and background"
          >
            <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
          </button>

          <ColourCard
            label="Background"
            colour={bg}
            textValue={bgText}
            onPickerChange={handleBgPicker}
            onTextChange={handleBgText}
            inputId="cc-bg-picker"
          />
        </div>

        <div
          className="rounded-xl border border-slate-200 dark:border-slate-700"
          style={{ backgroundColor: bg }}
        >
          <div className="flex flex-col gap-3 px-6 py-5">
            <p className="text-base leading-snug" style={{ color: fg }}>
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="text-2xl font-semibold leading-snug" style={{ color: fg }}>
              Large Text Aa
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        {!error && result && (
          <>
            <div className="flex flex-col items-center gap-1 py-2">
              <span
                className={`text-5xl font-bold tabular-nums ${
                  isLoading ? "opacity-50" : ""
                }`}
              >
                {result.ratioDisplay}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Contrast Ratio
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <WcagBadge
                label="AA Normal"
                sublabel="≥ 4.5:1 · body text"
                pass={result.aaNormal}
              />
              <WcagBadge
                label="AA Large"
                sublabel="≥ 3.0:1 · large text / UI"
                pass={result.aaLarge}
              />
              <WcagBadge
                label="AAA Normal"
                sublabel="≥ 7.0:1 · enhanced"
                pass={result.aaaNormal}
              />
              <WcagBadge
                label="AAA Large"
                sublabel="≥ 4.5:1 · enhanced large"
                pass={result.aaaLarge}
              />
            </div>
          </>
        )}

        {!error && !result && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-slate-400">
              Enter two colours to check contrast
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
