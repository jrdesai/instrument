import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { ToolbarFooter } from "../../components/tool";
import type { PassphraseInput } from "../../bindings/PassphraseInput";
import type { PassphraseOutput } from "../../bindings/PassphraseOutput";
import type { PassphraseSeparator } from "../../bindings/PassphraseSeparator";

const RUST_COMMAND = "tool_passphrase_process";
const COPIED_DURATION_MS = 1500;
const DEBOUNCE_MS = 150;

const SEPARATOR_OPTIONS: { value: PassphraseSeparator; label: string }[] = [
  { value: "Hyphen", label: "Hyphen" },
  { value: "Space", label: "Space" },
  { value: "Dot", label: "Dot" },
  { value: "Underscore", label: "_" },
  { value: "None", label: "None" },
];

function buildPayload(
  wordCount: number,
  count: number,
  separator: PassphraseSeparator,
  capitalize: boolean,
  includeNumber: boolean,
  includeSymbol: boolean
): PassphraseInput {
  return {
    wordCount,
    count,
    separator,
    capitalize,
    includeNumber,
    includeSymbol,
  };
}

function PassphraseGeneratorTool() {
  const [wordCount, setWordCount] = useState(4);
  const [count, setCount] = useState(1);
  const [separator, setSeparator] = useState<PassphraseSeparator>("Hyphen");
  const [capitalize, setCapitalize] = useState(false);
  const [includeNumber, setIncludeNumber] = useState(false);
  const [includeSymbol, setIncludeSymbol] = useState(false);

  const [output, setOutput] = useState<PassphraseOutput | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy all");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runGenerate = useCallback(
    async (
      wc: number,
      cnt: number,
      sep: PassphraseSeparator,
      cap: boolean,
      num: boolean,
      sym: boolean,
      options?: { skipHistory?: boolean }
    ) => {
      const payload = buildPayload(wc, cnt, sep, cap, num, sym);
      try {
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: options?.skipHistory ?? true,
        })) as PassphraseOutput;
        setOutput(result);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : e != null
              ? String(e)
              : "Failed to run tool";
        setOutput({
          passphrases: [],
          entropyBits: 0,
          wordCount: 0,
          wordlistSize: 0,
          error: message,
        });
      }
    },
    []
  );

  const scheduleGenerate = useCallback(
    (
      wc: number,
      cnt: number,
      sep: PassphraseSeparator,
      cap: boolean,
      num: boolean,
      sym: boolean
    ) => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        runGenerate(wc, cnt, sep, cap, num, sym, { skipHistory: true });
      }, DEBOUNCE_MS);
    },
    [runGenerate]
  );

  useEffect(() => {
    scheduleGenerate(wordCount, count, separator, capitalize, includeNumber, includeSymbol);
  }, [
    wordCount,
    count,
    separator,
    capitalize,
    includeNumber,
    includeSymbol,
    scheduleGenerate,
  ]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleRegenerate = useCallback(() => {
    runGenerate(wordCount, count, separator, capitalize, includeNumber, includeSymbol, {
      skipHistory: false,
    });
  }, [wordCount, count, separator, capitalize, includeNumber, includeSymbol, runGenerate]);

  const handleWordCountChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    setWordCount(Math.min(12, Math.max(3, value)));
  }, []);

  const handleCountChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    setCount(Math.min(50, Math.max(1, value)));
  }, []);

  const handleCopyLine = useCallback(
    async (index: number) => {
      const value = output?.passphrases[index];
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
    if (!output?.passphrases.length) return;
    try {
      await navigator.clipboard.writeText(output.passphrases.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    }
  }, [output]);

  const passphrases = output?.passphrases ?? [];
  const hasError = !!output?.error;
  const entropyBits = output?.entropyBits ?? 0;
  const wordlistSize = output?.wordlistSize ?? 0;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-sm shrink-0">
        <div className="flex flex-col">
          <span className="font-semibold">Passphrase Generator</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {passphrases.length > 0
              ? `${passphrases.length} ${passphrases.length === 1 ? "passphrase" : "passphrases"}`
              : "Configure options and generate"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            disabled={!passphrases.length || hasError}
            className="px-3 py-1 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {copyAllLabel}
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            aria-label="Regenerate passphrases"
            className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-2">
          {hasError ? (
            <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
              {output?.error}
            </div>
          ) : passphrases.length === 0 ? (
            <p className="text-slate-500 text-sm italic">Generating…</p>
          ) : (
            <ul className="space-y-2">
              {passphrases.map((phrase, index) => (
                <li
                  key={`phrase-${index}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark"
                >
                  <span className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all select-all">
                    {phrase}
                  </span>
                  <button
                    type="button"
                    aria-label={`Copy passphrase ${index + 1}`}
                    onClick={() => handleCopyLine(index)}
                    disabled={hasError}
                    className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copiedIndex === index ? "Copied" : "Copy"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ToolbarFooter
          groups={[
            {
              label: "Words",
              children: (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Decrease word count"
                    onClick={() => handleWordCountChange(wordCount - 1)}
                    className="rounded-lg border border-border-light bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    –
                  </button>
                  <input
                    type="number"
                    min={3}
                    max={12}
                    value={wordCount}
                    onChange={(e) => handleWordCountChange(Number(e.target.value))}
                    className="w-14 rounded-lg border border-border-light bg-background-light px-2 py-1 text-center text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-100"
                    aria-label="Words per passphrase"
                  />
                  <button
                    type="button"
                    aria-label="Increase word count"
                    onClick={() => handleWordCountChange(wordCount + 1)}
                    className="rounded-lg border border-border-light bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              ),
            },
            {
              label: "Separator",
              children: (
                <fieldset className="m-0 border-0 p-0">
                  <legend className="sr-only">Separator</legend>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {SEPARATOR_OPTIONS.map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer select-none items-center gap-1.5 text-sm"
                      >
                        <input
                          type="radio"
                          name="passphrase-separator"
                          checked={separator === value}
                          onChange={() => setSeparator(value)}
                          className="accent-primary"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ),
            },
            {
              label: "Options",
              children: (
                <>
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={capitalize}
                      onChange={(e) => setCapitalize(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    <span>Capitalize</span>
                  </label>
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={includeNumber}
                      onChange={(e) => setIncludeNumber(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    <span>Add number</span>
                  </label>
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={includeSymbol}
                      onChange={(e) => setIncludeSymbol(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    <span>Add symbol</span>
                  </label>
                </>
              ),
            },
            {
              label: "Count",
              children: (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Decrease count"
                    onClick={() => handleCountChange(count - 1)}
                    className="rounded-lg border border-border-light bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    –
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) => handleCountChange(Number(e.target.value))}
                    className="w-14 rounded-lg border border-border-light bg-background-light px-2 py-1 text-center text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-100"
                    aria-label="Number of passphrases"
                  />
                  <button
                    type="button"
                    aria-label="Increase count"
                    onClick={() => handleCountChange(count + 1)}
                    className="rounded-lg border border-border-light bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              ),
            },
            {
              label: "Entropy",
              children: (
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {entropyBits.toFixed(1)} bits · {wordlistSize} words in list
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

export default PassphraseGeneratorTool;
