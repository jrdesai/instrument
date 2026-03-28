import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import type { ConfigConvertInput } from "../../bindings/ConfigConvertInput";
import type { ConfigConvertOutput } from "../../bindings/ConfigConvertOutput";
import type { ConfigFormat } from "../../bindings/ConfigFormat";

type IndentOption = 2 | 4;

const RUST_COMMAND = "tool_config_convert";
const DRAFT_TOOL_ID = "config-converter";

const FORMAT_ORDER: ConfigFormat[] = ["Json", "Yaml", "Toml"];

function nextFormatAfter(f: ConfigFormat): ConfigFormat {
  const i = FORMAT_ORDER.indexOf(f);
  return FORMAT_ORDER[(i + 1) % FORMAT_ORDER.length];
}

function formatLabel(f: ConfigFormat): string {
  switch (f) {
    case "Json":
      return "JSON";
    case "Yaml":
      return "YAML";
    case "Toml":
      return "TOML";
    default:
      return f;
  }
}

function validityLabel(from: ConfigFormat, valid: boolean): string {
  const name = formatLabel(from);
  return valid ? `✓ Valid ${name}` : `✗ Invalid ${name}`;
}

const ConfigConverterTool: React.FC = () => {
  const { setDraft } = useDraftInput(DRAFT_TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(DRAFT_TOOL_ID, setInput);
  const [from, setFrom] = useState<ConfigFormat>("Yaml");
  const [to, setTo] = useState<ConfigFormat>("Json");
  const [indent, setIndent] = useState<IndentOption>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [output, setOutput] = useState<ConfigConvertOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasInput = input.trim().length > 0;
  const showJsonOptions = to === "Json";

  const runProcess = useCallback(
    async (
      value: string,
      payload: Omit<ConfigConvertInput, "value">,
      skipHistory: boolean
    ) => {
      if (!value.trim()) {
        setOutput(null);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      try {
        const full: ConfigConvertInput = { value, ...payload };
        const result = (await callTool(RUST_COMMAND, full, {
          skipHistory,
        })) as ConfigConvertOutput;
        setOutput(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Config convert failed", err);
        setOutput({
          result: "",
          isValidInput: false,
          error: err instanceof Error ? err.message : "Unknown error",
          errorLine: null,
          errorColumn: null,
          lineCount: 0,
          charCount: 0,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const debouncedProcess = useMemo(() => {
    let timeout: number | undefined;
    return (
      nextInput: string,
      payload: Omit<ConfigConvertInput, "value">
    ) => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(() => {
        void runProcess(nextInput, payload, true);
      }, 200);
    };
  }, [runProcess]);

  useEffect(() => {
    debouncedProcess(input, { from, to, indent, sortKeys });
  }, [input, from, to, indent, sortKeys, debouncedProcess]);

  const handleChangeInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInput(v);
    setDraft(v);
  };

  const handleBlurInput = () => {
    if (!input.trim()) return;
    void runProcess(input, { from, to, indent, sortKeys }, false);
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = e.target.value as ConfigFormat;
    setFrom(f);
    if (f === to) {
      setTo(nextFormatAfter(f));
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = e.target.value as ConfigFormat;
    if (t === from) {
      setTo(nextFormatAfter(from));
    } else {
      setTo(t);
    }
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
    if (output?.isValidInput && output.result) {
      setInput(output.result);
      setDraft(output.result);
    }
  };

  const handleClear = () => {
    setInput("");
    setDraft("");
    setOutput(null);
  };

  const handleCopy = async () => {
    if (!output?.result) return;
    try {
      await navigator.clipboard.writeText(output.result);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Copy failed", err);
    }
  };

  const effectiveOutput = output;
  const isValid = !!effectiveOutput && effectiveOutput.isValidInput;

  const outputLanguage =
    to === "Json" ? "json" : to === "Yaml" ? "yaml" : "toml";

  const selectClass =
    "text-xs rounded-full border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-2 py-0.5 text-slate-600 dark:text-slate-300 cursor-pointer max-w-[7.5rem] outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  const indentPillClass = (value: IndentOption) =>
    [
      "px-2 py-0.5 rounded-full text-xs cursor-pointer transition-colors",
      indent === value
        ? "bg-primary/10 text-primary border border-primary/30"
        : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:bg-slate-200 dark:hover:bg-panel-light/40",
    ].join(" ");

  const inputPlaceholder = `Paste ${formatLabel(from)} here…`;

  return (
    <div className="flex flex-col h-full w-full bg-background-light dark:bg-background-dark">
      <div className="flex-1 flex flex-row min-h-0 border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-panel-light/60 dark:bg-panel-dark/60">
        <div className="flex flex-col w-1/2 border-r border-border-light dark:border-border-dark bg-panel-light/60 dark:bg-panel-dark/60">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light/80 dark:bg-panel-dark/80">
            <div className="flex items-center gap-2 min-w-0">
              <select
                aria-label="Input format"
                className={selectClass}
                value={from}
                onChange={handleFromChange}
              >
                <option value="Json">JSON</option>
                <option value="Yaml">YAML</option>
                <option value="Toml">TOML</option>
              </select>
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-[0.16em] truncate">
                INPUT
              </span>
            </div>
            <span className="text-slate-600 text-xs tabular-nums shrink-0">
              {input.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            className="flex-1 w-full resize-none border-none outline-none bg-transparent font-mono text-xs text-slate-700 dark:text-slate-300 p-4 leading-relaxed"
            placeholder={inputPlaceholder}
            spellCheck={false}
            value={input}
            onChange={handleChangeInput}
            onBlur={handleBlurInput}
          />
        </div>

        <div className="flex flex-col w-1/2 bg-panel-light/40 dark:bg-panel-dark/40">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light/80 dark:bg-panel-dark/80">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <select
                aria-label="Output format"
                className={selectClass}
                value={to}
                onChange={handleToChange}
              >
                <option value="Json">JSON</option>
                <option value="Yaml">YAML</option>
                <option value="Toml">TOML</option>
              </select>
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-[0.16em]">
                OUTPUT
              </span>
              {hasInput && effectiveOutput && (
                <span
                  className={[
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    isValid
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400",
                  ].join(" ")}
                >
                  {validityLabel(from, isValid)}
                </span>
              )}
              {isProcessing && (
                <span className="text-slate-500 text-xs">Processing…</span>
              )}
            </div>
            {isValid && effectiveOutput && (
              <span className="text-slate-600 text-xs tabular-nums shrink-0">
                {effectiveOutput.lineCount.toLocaleString()} lines ·{" "}
                {effectiveOutput.charCount.toLocaleString()} chars
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0">
            {!hasInput && (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <p className="text-slate-600 text-sm mb-2">
                  Paste {formatLabel(from)} on the left to convert to{" "}
                  {formatLabel(to)}.
                </p>
              </div>
            )}

            {hasInput && effectiveOutput && isValid && effectiveOutput.result && (
              <CodeBlock
                code={effectiveOutput.result}
                language={outputLanguage}
                maxHeight="100%"
                showCopyButton
              />
            )}

            {hasInput && effectiveOutput && isValid && !effectiveOutput.result && (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm px-4">
                Empty result.
              </div>
            )}

            {hasInput && effectiveOutput && !isValid && (
              <div className="h-full overflow-auto">
                <div className="p-4 text-red-400 text-sm font-mono space-y-1">
                  {effectiveOutput.error && (
                    <div>
                      {effectiveOutput.errorLine != null &&
                      effectiveOutput.errorColumn != null ? (
                        <span>
                          Line {effectiveOutput.errorLine}, Column{" "}
                          {effectiveOutput.errorColumn}: {effectiveOutput.error}
                        </span>
                      ) : (
                        <span>{effectiveOutput.error}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark/70 px-4 py-2 text-[11px] text-slate-500">
            <span className="font-semibold tracking-wide uppercase text-[10px]">
              Formats
            </span>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-600 leading-relaxed">
              JSON for APIs and JS; YAML for Kubernetes and CI; TOML for Cargo and
              config files. Round-trips may change key order or representation.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <button
          type="button"
          onClick={handleSwap}
          className="px-2 py-0.5 rounded-full text-xs border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-panel-light/40 transition-colors"
          title="Swap input/output formats (and move output text to input when valid)"
        >
          ⇄ Swap
        </button>

        {showJsonOptions && (
          <>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.16em] text-[10px] text-slate-500">
                INDENT
              </span>
              <button
                type="button"
                className={indentPillClass(2)}
                onClick={() => setIndent(2)}
              >
                2 spaces
              </button>
              <button
                type="button"
                className={indentPillClass(4)}
                onClick={() => setIndent(4)}
              >
                4 spaces
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.16em] text-[10px] text-slate-500">
                OPTIONS
              </span>
              <button
                type="button"
                onClick={() => setSortKeys((v) => !v)}
                className={[
                  "px-2 py-0.5 rounded-full text-xs border transition-colors",
                  sortKeys
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border-border-light dark:border-border-dark hover:bg-slate-200 dark:hover:bg-panel-light/40",
                ].join(" ")}
              >
                {sortKeys ? "Sort keys: on" : "Sort keys: off"}
              </button>
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isValid && effectiveOutput?.result && (
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 rounded-md bg-primary/90 text-white text-xs font-medium hover:bg-primary transition-colors"
            >
              Copy
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1 rounded-md bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark text-xs hover:bg-slate-200 dark:hover:bg-panel-light/60 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigConverterTool;
