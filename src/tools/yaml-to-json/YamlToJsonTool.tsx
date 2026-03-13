import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { callTool } from "../../bridge";

type YamlToJsonInputPayload = {
  value: string;
  indent: number;
  sortKeys: boolean;
};

type YamlToJsonOutputPayload = {
  result: string;
  isValidYaml: boolean;
  error?: string | null;
  errorLine?: number | null;
  errorColumn?: number | null;
  lineCount: number;
  charCount: number;
};

type IndentOption = 2 | 4;

const TOOL_ID = "tool_yaml_to_json";

const YamlToJsonTool: React.FC = () => {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState<IndentOption>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [output, setOutput] = useState<YamlToJsonOutputPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasInput = input.trim().length > 0;

  const runProcess = useCallback(
    async (value: string, nextIndent: IndentOption, nextSortKeys: boolean) => {
      if (!value.trim()) {
        setOutput(null);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      try {
        const payload: YamlToJsonInputPayload = {
          value,
          indent: nextIndent,
          sortKeys: nextSortKeys,
        };
        const result = (await callTool(
          TOOL_ID,
          payload
        )) as unknown as YamlToJsonOutputPayload;
        setOutput(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("YAML to JSON processing failed", err);
        setOutput({
          result: "",
          isValidYaml: false,
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
    return (nextInput: string, nextIndent: IndentOption, nextSortKeys: boolean) => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(() => {
        void runProcess(nextInput, nextIndent, nextSortKeys);
      }, 200);
    };
  }, [runProcess]);

  useEffect(() => {
    debouncedProcess(input, indent, sortKeys);
  }, [input, indent, sortKeys, debouncedProcess]);

  const handleChangeInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleClear = () => {
    setInput("");
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
  const isValid = !!effectiveOutput && effectiveOutput.isValidYaml;

  const indentPillClass = (value: IndentOption) =>
    [
      "px-2 py-0.5 rounded-full text-xs cursor-pointer transition-colors",
      indent === value
        ? "bg-primary/10 text-primary border border-primary/30"
        : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:bg-slate-200 dark:hover:bg-panel-light/40",
    ].join(" ");

  return (
    <div className="flex flex-col h-full w-full bg-background-light dark:bg-background-dark">
      <div className="flex-1 flex flex-row min-h-0 border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-panel-light/60 dark:bg-panel-dark/60">
        {/* Left: YAML input */}
        <div className="flex flex-col w-1/2 border-r border-border-light dark:border-border-dark bg-panel-light/60 dark:bg-panel-dark/60">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light/80 dark:bg-panel-dark/80">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-[0.16em]">
              YAML INPUT
            </span>
            <span className="text-slate-600 text-xs tabular-nums">
              {input.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            className="flex-1 w-full resize-none border-none outline-none bg-transparent font-mono text-xs text-slate-700 dark:text-slate-300 p-4 leading-relaxed"
            placeholder="Paste YAML here..."
            spellCheck={false}
            value={input}
            onChange={handleChangeInput}
          />
        </div>

        {/* Right: JSON output */}
        <div className="flex flex-col w-1/2 bg-panel-light/40 dark:bg-panel-dark/40">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light/80 dark:bg-panel-dark/80">
            <div className="flex items-center gap-2">
              {hasInput && effectiveOutput && (
                <span
                  className={[
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    isValid
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400",
                  ].join(" ")}
                >
                  {isValid ? "✓ Valid YAML" : "✗ Invalid YAML"}
                </span>
              )}
              {isProcessing && (
                <span className="text-slate-500 text-xs">Processing…</span>
              )}
            </div>
            {isValid && effectiveOutput && (
              <span className="text-slate-600 text-xs tabular-nums">
                {effectiveOutput.lineCount.toLocaleString()} lines ·{" "}
                {effectiveOutput.charCount.toLocaleString()} chars
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0">
            {!hasInput && (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <p className="text-slate-600 text-sm mb-2">
                  Paste YAML on the left to convert to JSON.
                </p>
              </div>
            )}

            {hasInput && effectiveOutput && isValid && (
              <CodeBlock
                code={effectiveOutput.result}
                language="json"
                maxHeight="100%"
                showCopyButton
              />
            )}

            {hasInput && effectiveOutput && !isValid && (
              <div className="h-full overflow-auto">
                <div className="p-4 text-red-400 text-sm font-mono space-y-1">
                  {effectiveOutput.error && (
                    <div>
                      {effectiveOutput.errorLine && effectiveOutput.errorColumn ? (
                        <span>
                          Line {effectiveOutput.errorLine}, Column {effectiveOutput.errorColumn}:{" "}
                          {effectiveOutput.error}
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

          {/* YAML Quick Reference (simple always-visible collapsed text to keep it minimal) */}
          <div className="border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark/70 px-4 py-2 text-[11px] text-slate-500">
            <span className="font-semibold tracking-wide uppercase text-[10px]">
              YAML Quick Reference
            </span>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-slate-500 dark:text-slate-600 leading-relaxed">
              {`Strings:
name: John
title: "Hello"

Arrays:
roles:
  - admin
  - editor

Objects:
address:
  city: London
  postcode: E1 6RF

Anchors:
base: &base
  color: red
item:
  <<: *base
  name: test`}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
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

        <div className="ml-auto flex items-center gap-2">
          {isValid && effectiveOutput?.result && (
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 rounded-md bg-primary/90 text-white text-xs font-medium hover:bg-primary transition-colors"
            >
              Copy JSON
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

export default YamlToJsonTool;

