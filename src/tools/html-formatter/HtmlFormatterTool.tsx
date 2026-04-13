import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton, PillButton } from "../../components/tool";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";
import { useHistoryStore } from "../../store";
import type { HtmlFormatInput } from "../../bindings/HtmlFormatInput";
import type { HtmlFormatOutput } from "../../bindings/HtmlFormatOutput";

const TOOL_ID = "html-formatter";
const RUST_COMMAND = "html_format";
const DEBOUNCE_MS = 300;
const HISTORY_DEBOUNCE_MS = 1500;

type IndentChoice = 2 | 4 | 0;

export default function HtmlFormatterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [inputValue, setInputValue] = useState("");
  useRestoreStringDraft(TOOL_ID, setInputValue);
  const [indentSize, setIndentSize] = useState<IndentChoice>(2);
  const [wrapAttributes, setWrapAttributes] = useState(false);
  const [printWidth, setPrintWidth] = useState(80);
  const [output, setOutput] = useState<HtmlFormatOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runFormat = useCallback(
    async (
      value: string,
      indent: IndentChoice,
      wrap: boolean,
      width: number
    ) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: HtmlFormatInput = {
          code: trimmed,
          indentSize: indent,
          wrapAttributes: wrap,
          printWidth: width,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as HtmlFormatOutput;
        setOutput(result);
        if (!result.error && result.formatted.length > 0) {
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
        const message = e instanceof Error ? e.message : String(e ?? "Format failed");
        setOutput({ formatted: "", error: message });
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
      runFormat(inputValue, indentSize, wrapAttributes, printWidth);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, indentSize, wrapAttributes, printWidth, runFormat]);

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
      reader.readAsText(file);
      e.target.value = "";
    },
    [setDraft]
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    setDraft("");
    setFileName(null);
    setFileDropError(null);
    setOutput(null);
  }, [setDraft]);

  const isEmpty = inputValue.trim() === "";
  const showOutputError = output?.error != null && output.error !== "";

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div
        className="flex h-8 shrink-0 items-center gap-6 border-b border-border-light px-4 text-xs dark:border-border-dark"
        role="group"
        aria-label="Format options"
      >
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Indent
          </span>
          <select
            className="rounded border border-border-light bg-panel-light px-2 py-0.5 text-xs text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-200"
            value={indentSize}
            onChange={(e) => setIndentSize(Number(e.target.value) as IndentChoice)}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={0}>Tabs</option>
          </select>
        </label>
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Wrap attributes
          </span>
          <PillButton
            active={wrapAttributes}
            onClick={() => setWrapAttributes((v) => !v)}
            size="sm"
            shape="full"
            aria-label={wrapAttributes ? "Wrap attributes on" : "Wrap attributes off"}
          >
            {wrapAttributes ? "On" : "Off"}
          </PillButton>
        </div>
        <label
          className={`flex items-center gap-2 ${wrapAttributes ? "text-slate-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"}`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Print width
          </span>
          <input
            type="number"
            min={40}
            max={200}
            disabled={!wrapAttributes}
            className="w-14 rounded border border-border-light bg-panel-light px-2 py-0.5 text-xs tabular-nums text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:bg-panel-dark dark:text-slate-200"
            value={printWidth}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setPrintWidth(Math.min(200, Math.max(40, n)));
            }}
          />
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          className="relative flex min-h-[180px] min-w-0 flex-1 flex-col border-b border-border-light dark:border-border-dark md:min-h-0 md:border-b-0 md:border-r"
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
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark min-h-[41px]">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Input
              </span>
              {fileName ? (
                <>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">{fileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFileName(null);
                      setFileDropError(null);
                      setInputValue("");
                      setDraft("");
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    ✕
                  </button>
                </>
              ) : null}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-0.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  accept=".html,.htm,text/html,text/plain"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              {!isEmpty ? (
                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {inputValue.length.toLocaleString()} chars
                </span>
              ) : null}
              {!isEmpty ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <textarea
            aria-label="HTML input"
            className="min-h-0 w-full flex-1 resize-none border-none bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-300"
            placeholder="Paste HTML here…"
            value={inputValue}
            onChange={(e) => {
              setFileDropError(null);
              const v = e.target.value;
              setInputValue(v);
              setDraft(v);
            }}
          />
        </div>

        <div className="flex min-h-[180px] min-w-0 flex-1 flex-col md:min-h-0">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark min-h-[41px]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Output
            </span>
            <div className="flex items-center gap-3">
              {output?.formatted && !showOutputError ? (
                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {output.formatted.split("\n").length.toLocaleString()} lines
                </span>
              ) : null}
              {output?.formatted && !showOutputError ? (
                <CopyButton
                  value={output.formatted}
                  label="Copy"
                  variant="outline"
                  className="py-1 text-[11px] font-semibold uppercase tracking-wider"
                />
              ) : null}
            </div>
          </div>
          {showOutputError ? (
            <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {output?.error}
            </div>
          ) : null}
          <div className="custom-scrollbar min-h-0 flex-1 overflow-auto">
            {output?.formatted && !showOutputError ? (
              <CodeBlock
                language="markup"
                code={output.formatted}
                className="h-full min-h-0"
                maxHeight="100%"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-xs text-slate-500">
                {isEmpty ? "Enter HTML on the left." : showOutputError ? "" : "Formatting…"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
