import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";
import { useHistoryStore } from "../../store";
import type { SqlFormatInput } from "../../bindings/SqlFormatInput";
import type { SqlFormatOutput } from "../../bindings/SqlFormatOutput";
import type { SqlIndentStyle } from "../../bindings/SqlIndentStyle";
import type { SqlKeywordCase } from "../../bindings/SqlKeywordCase";

const TOOL_ID = "sql-formatter";
const RUST_COMMAND = "tool_sql_format";
const DEBOUNCE_MS = 300;
const HISTORY_DEBOUNCE_MS = 1500;

function SqlFormatterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [inputValue, setInputValue] = useState("");
  useRestoreStringDraft(TOOL_ID, setInputValue);
  const [indent, setIndent] = useState<SqlIndentStyle>("spaces2");
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>("upper");
  const [output, setOutput] = useState<SqlFormatOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runFormat = useCallback(
    async (value: string, currentIndent: SqlIndentStyle, currentCase: SqlKeywordCase) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: SqlFormatInput = {
          value: trimmed,
          indent: currentIndent,
          keywordCase: currentCase,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as SqlFormatOutput;
        setOutput(result);
        if (!result.error && result.result.length > 0) {
          if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
          historyDebounceRef.current = setTimeout(() => {
            addHistoryEntry(TOOL_ID, {
              input: payload,
              output: result,
              timestamp: Date.now(),
            });
            historyDebounceRef.current = null;
          }, HISTORY_DEBOUNCE_MS);
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : String(e ?? "Format failed");
        setOutput({
          result: "",
          lineCount: 0,
          charCount: trimmed.length,
          error: message,
        });
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = inputValue.trim();
    if (trimmed === "") {
      setOutput(null);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = setTimeout(() => {
      runFormat(inputValue, indent, keywordCase);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, indent, keywordCase, runFormat]);

  const { isDragging, dropZoneProps } = useFileDrop({
    onFile: (text, filename) => {
      setFileDropError(null);
      setFileName(filename);
      setInputValue(text);
      setDraft(text);
    },
    onError: (msg) => setFileDropError(msg),
  });

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileDropError(null);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setInputValue(text);
          setDraft(text);
        }
      };
      reader.onerror = () => {
        setFileDropError("Failed to read file — it may be locked or unreadable.");
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setDraft]
  );

  const handleDownload = useCallback((content: string, downloadName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("");
    setDraft("");
    setFileName(null);
    setFileDropError(null);
    setOutput(null);
  }, [setDraft]);

  const handleFormatNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    runFormat(inputValue, indent, keywordCase);
  }, [inputValue, indent, keywordCase, runFormat]);

  const isEmpty = inputValue.trim() === "";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — input */}
        <div
          className="relative flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark"
          {...dropZoneProps}
        >
          {isDragging && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[32px] text-primary/60">
                upload_file
              </span>
              <span className="text-sm font-medium text-primary/70">Drop file to load</span>
            </div>
          )}
          {fileDropError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {fileDropError}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[41px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {fileName ?? "Input"}
              </span>
              {fileName ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              ) : null}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-0.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  accept=".sql,text/plain"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {!isEmpty && (
              <span className="text-slate-600 text-xs tabular-nums">
                {inputValue.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="SQL input"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder={`SELECT *\nFROM users\nWHERE id = 1;`}
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setFileDropError(null);
              setInputValue(v);
              setDraft(v);
            }}
          />
        </div>

        {/* Right panel — output */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[41px]">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              OUTPUT
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {output
                  ? `${output.lineCount.toLocaleString()} lines · ${output.charCount.toLocaleString()} chars`
                  : "Formatting..."}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-background-light dark:bg-background-dark">
            {output?.result ? (
              <CodeBlock
                language="sql"
                code={output.result}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 px-4">
                {isEmpty
                  ? "Enter SQL on the left to see formatted output here."
                  : "Formatting..."}
              </div>
            )}
          </div>
          {output?.error && (
            <div className="px-4 py-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900">
              {output.error}
            </div>
          )}
        </div>
      </div>

      {/* Footer — options + actions */}
      <footer className="shrink-0 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 text-xs text-slate-500 dark:text-slate-400">
          {/* Indent group */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider">
              Indent
            </span>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="sql-indent"
                  className="h-3 w-3 accent-primary"
                  checked={indent === "spaces2"}
                  onChange={() => setIndent("spaces2")}
                />
                <span>2 Spaces</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="sql-indent"
                  className="h-3 w-3 accent-primary"
                  checked={indent === "spaces4"}
                  onChange={() => setIndent("spaces4")}
                />
                <span>4 Spaces</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="sql-indent"
                  className="h-3 w-3 accent-primary"
                  checked={indent === "tab"}
                  onChange={() => setIndent("tab")}
                />
                <span>Tab</span>
              </label>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-border-light dark:bg-border-dark self-center mx-1" />

          {/* Keyword case group */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider">
              Keywords
            </span>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="sql-keywords"
                  className="h-3 w-3 accent-primary"
                  checked={keywordCase === "upper"}
                  onChange={() => setKeywordCase("upper")}
                />
                <span>Uppercase</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="sql-keywords"
                  className="h-3 w-3 accent-primary"
                  checked={keywordCase === "lower"}
                  onChange={() => setKeywordCase("lower")}
                />
                <span>Lowercase</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="sql-keywords"
                  className="h-3 w-3 accent-primary"
                  checked={keywordCase === "preserve"}
                  onChange={() => setKeywordCase("preserve")}
                />
                <span>Preserve</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={handleFormatNow}
              disabled={isEmpty}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Format
            </button>
            {output?.result && !output.error ? (
              <button
                type="button"
                onClick={() =>
                  handleDownload(
                    output.result,
                    fileName ?? "formatted.sql",
                    "text/plain"
                  )
                }
                className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
              >
                Download .sql
              </button>
            ) : null}
            <CopyButton
              value={
                output?.result && !output.error ? output.result : undefined
              }
              label="Copy"
              variant="primary"
              className="py-1.5 text-[11px] font-semibold uppercase tracking-wider"
            />
            <button
              type="button"
              onClick={handleClear}
              disabled={isEmpty && !output}
              className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SqlFormatterTool;

