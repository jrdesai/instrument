import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import type { PasswordInput } from "../../bindings/PasswordInput";
import type { PasswordOutput } from "../../bindings/PasswordOutput";
import type { PasswordStrength } from "../../bindings/PasswordStrength";

const RUST_COMMAND = "password_process";
const COPIED_DURATION_MS = 1500;
const DEFAULT_SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const DEBOUNCE_MS = 150;

/** Number of strength bar segments filled based on entropy. */
function segmentsFilled(entropyBits: number): number {
  return Math.min(5, Math.floor(entropyBits / 20));
}

/** Tailwind colour class for the filled segments. */
function strengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case "Weak":       return "bg-red-500";
    case "Fair":       return "bg-orange-400";
    case "Strong":     return "bg-yellow-400";
    case "VeryStrong": return "bg-emerald-500";
  }
}

/** Human-readable strength label. */
function strengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case "Weak":       return "Weak";
    case "Fair":       return "Fair";
    case "Strong":     return "Strong";
    case "VeryStrong": return "Very Strong";
  }
}

function PasswordGeneratorTool() {
  const [length, setLength] = useState<number>(16);
  const [count, setCount] = useState<number>(1);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(false);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);

  const [output, setOutput] = useState<PasswordOutput | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy all");

  // Track if symbols field was ever shown (to pre-fill on first enable)
  const symbolsEverEnabled = useRef(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runGenerate = useCallback(
    async (
      len: number,
      cnt: number,
      upper: boolean,
      lower: boolean,
      numbers: boolean,
      syms: boolean,
      excAmb: boolean,
      symbolSet: string
    ) => {
      const payload: PasswordInput = {
        length: len,
        count: cnt,
        includeUppercase: upper,
        includeLowercase: lower,
        includeNumbers: numbers,
        includeSymbols: syms,
        excludeAmbiguous: excAmb,
        symbols: symbolSet,
      };
      try {
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as PasswordOutput;
        setOutput(result);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : e != null
              ? String(e)
              : "Failed to run tool";
        setOutput({
          passwords: [],
          strength: "Weak",
          entropyBits: 0,
          alphabetSize: 0,
          error: message,
        });
      }
    },
    []
  );

  // Debounced auto-regenerate on any setting change
  const scheduleGenerate = useCallback(
    (
      len: number,
      cnt: number,
      upper: boolean,
      lower: boolean,
      numbers: boolean,
      syms: boolean,
      excAmb: boolean,
      symbolSet: string
    ) => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        runGenerate(len, cnt, upper, lower, numbers, syms, excAmb, symbolSet);
      }, DEBOUNCE_MS);
    },
    [runGenerate]
  );

  // Initial generation on mount
  useEffect(() => {
    runGenerate(length, count, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeAmbiguous, symbols);
  }, []);

  // Re-generate when settings change
  useEffect(() => {
    scheduleGenerate(length, count, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeAmbiguous, symbols);
  }, [length, count, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeAmbiguous, symbols, scheduleGenerate]);

  const handleRegenerate = useCallback(() => {
    runGenerate(length, count, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeAmbiguous, symbols);
  }, [length, count, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeAmbiguous, symbols, runGenerate]);

  const handleLengthChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    setLength(Math.min(128, Math.max(4, value)));
  }, []);

  const handleCountChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    setCount(Math.min(10, Math.max(1, value)));
  }, []);

  const handleToggleSymbols = useCallback((checked: boolean) => {
    setIncludeSymbols(checked);
    if (checked && !symbolsEverEnabled.current) {
      symbolsEverEnabled.current = true;
      setSymbols(DEFAULT_SYMBOLS);
    }
  }, []);

  const handleCopyLine = useCallback(
    async (index: number) => {
      const value = output?.passwords[index];
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), COPIED_DURATION_MS);
      } catch {
        // ignore clipboard errors
      }
    },
    [output]
  );

  const handleCopyAll = useCallback(async () => {
    if (!output?.passwords.length) return;
    try {
      await navigator.clipboard.writeText(output.passwords.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    }
  }, [output]);

  const passwords = output?.passwords ?? [];
  const hasError = !!output?.error;
  const entropyBits = output?.entropyBits ?? 0;
  const alphabetSize = output?.alphabetSize ?? 0;
  const strength = output?.strength ?? "Weak";
  const filled = segmentsFilled(entropyBits);
  const color = strengthColor(strength);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-sm shrink-0">
        <div className="flex flex-col">
          <span className="font-semibold">Password Generator</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {passwords.length > 0
              ? `${passwords.length} ${passwords.length === 1 ? "password" : "passwords"}`
              : "Configure options and generate"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            disabled={!passwords.length || hasError}
            className="px-3 py-1 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {copyAllLabel}
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            aria-label="Regenerate passwords"
            className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Password list */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {hasError ? (
          <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
            {output?.error}
          </div>
        ) : passwords.length === 0 ? (
          <p className="text-slate-500 text-sm italic">
            Generating…
          </p>
        ) : (
          <ul className="space-y-2">
            {passwords.map((pw, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark"
              >
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all select-all">
                  {pw}
                </span>
                <button
                  type="button"
                  aria-label={`Copy password ${index + 1}`}
                  onClick={() => handleCopyLine(index)}
                  className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shrink-0"
                >
                  {copiedIndex === index ? "Copied" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3 space-y-3">
        {/* Length row */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider w-14 shrink-0">
            Length
          </span>
          <input
            type="range"
            min={4}
            max={128}
            step={1}
            value={length}
            onChange={(e) => handleLengthChange(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Password length slider"
          />
          <input
            type="number"
            min={4}
            max={128}
            value={length}
            onChange={(e) => handleLengthChange(Number(e.target.value))}
            className="w-16 px-2 py-1 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Password length"
          />
        </div>

        {/* Checkboxes row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {(
            [
              { label: "Uppercase", value: includeUppercase, setter: setIncludeUppercase },
              { label: "Lowercase", value: includeLowercase, setter: setIncludeLowercase },
              { label: "Numbers",   value: includeNumbers,   setter: setIncludeNumbers },
            ] as const
          ).map(({ label, value, setter }) => (
            <label key={label} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setter(e.target.checked)}
                className="accent-primary w-3.5 h-3.5"
              />
              <span>{label}</span>
            </label>
          ))}
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSymbols}
              onChange={(e) => handleToggleSymbols(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            <span>Symbols</span>
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={excludeAmbiguous}
              onChange={(e) => setExcludeAmbiguous(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            <span>Exclude ambiguous <span className="font-mono text-xs">(0 O o 1 I l)</span></span>
          </label>
        </div>

        {/* Symbols input — only shown when symbols enabled */}
        {includeSymbols && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider w-14 shrink-0">
              Symbols
            </span>
            <input
              type="text"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder={DEFAULT_SYMBOLS}
              className="flex-1 px-2 py-1 text-xs font-mono bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Custom symbol set"
            />
          </div>
        )}

        {/* Count row */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider w-14 shrink-0">
            Count
          </span>
          <button
            type="button"
            aria-label="Decrease count"
            onClick={() => handleCountChange(count - 1)}
            className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 border border-border-light dark:border-border-dark transition-colors"
          >
            –
          </button>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => handleCountChange(Number(e.target.value))}
            className="w-14 px-2 py-1 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Number of passwords"
          />
          <button
            type="button"
            aria-label="Increase count"
            onClick={() => handleCountChange(count + 1)}
            className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 border border-border-light dark:border-border-dark transition-colors"
          >
            +
          </button>
        </div>

        {/* Strength bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider w-14 shrink-0">
            Strength
          </span>
          <div className="flex gap-1" aria-label={`Password strength: ${strengthLabel(strength)}`}>
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i < filled
                    ? color
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {strengthLabel(strength)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            · {entropyBits.toFixed(1)} bits · {alphabetSize} chars
          </span>
        </div>
      </div>
    </div>
  );
}

export default PasswordGeneratorTool;
