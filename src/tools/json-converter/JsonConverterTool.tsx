import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton, FileUploadButton, PillButton, ToolbarFooter } from "../../components/tool";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";
import { useHistoryStore } from "../../store";

import type { ConversionTarget } from "../../bindings/ConversionTarget";
import type { JsonConvertInput } from "../../bindings/JsonConvertInput";
import type { JsonConvertOutput } from "../../bindings/JsonConvertOutput";

const RUST_COMMAND = "tool_json_convert";
const TOOL_ID = "json-converter";
const DEBOUNCE_MS = 200;
const HISTORY_DEBOUNCE_MS = 1500;

const FORMAT_META: Record<
  ConversionTarget,
  { ext: string; mime: string }
> = {
  yaml: { ext: "yaml", mime: "text/yaml" },
  typeScript: { ext: "ts", mime: "text/plain" },
  csv: { ext: "csv", mime: "text/csv" },
  xml: { ext: "xml", mime: "application/xml" },
};

function targetLabel(target: ConversionTarget): string {
  switch (target) {
    case "yaml":
      return "OUTPUT (YAML)";
    case "typeScript":
      return "OUTPUT (TYPESCRIPT)";
    case "csv":
      return "OUTPUT (CSV)";
    case "xml":
      return "OUTPUT (XML)";
  }
}

function targetLanguage(target: ConversionTarget): "yaml" | "typescript" | "bash" | "markup" {
  switch (target) {
    case "yaml":
      return "yaml";
    case "typeScript":
      return "typescript";
    case "csv":
      return "bash";
    case "xml":
      return "markup";
  }
}

function JsonConverterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [inputValue, setInputValue] = useState("");
  useRestoreStringDraft(TOOL_ID, setInputValue);
  const [target, setTarget] = useState<ConversionTarget>("yaml");
  const [tsRootName, setTsRootName] = useState("Root");
  const [tsExport, setTsExport] = useState(true);
  const [tsOptional, setTsOptional] = useState(false);
  const [xmlRootElement, setXmlRootElement] = useState("root");
  const [output, setOutput] = useState<JsonConvertOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      value: string,
      currentTarget: ConversionTarget,
      options: {
        tsRootName: string;
        tsExport: boolean;
        tsOptional: boolean;
        xmlRootElement: string;
      }
    ) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: JsonConvertInput = {
          value: trimmed,
          target: currentTarget,
          tsRootName: null,
          tsExport: null,
          tsOptionalFields: null,
          xmlRootElement: null,
        };
        if (currentTarget === "typeScript") {
          payload.tsRootName = options.tsRootName || "Root";
          payload.tsExport = options.tsExport;
          payload.tsOptionalFields = options.tsOptional;
        }
        if (currentTarget === "xml") {
          payload.xmlRootElement = options.xmlRootElement || "root";
        }
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as JsonConvertOutput;
        setOutput(result);
        if (result.isValidJson && !result.error) {
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
          e instanceof Error ? e.message : String(e ?? "Conversion failed");
        setOutput({
          result: "",
          isValidJson: false,
          target: currentTarget,
          error: message,
          warning: null,
          lineCount: 0,
          charCount: 0,
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
    const opts = {
      tsRootName,
      tsExport,
      tsOptional,
      xmlRootElement,
    };
    debounceRef.current = setTimeout(() => {
      runProcess(inputValue, target, opts);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, target, tsRootName, tsExport, tsOptional, xmlRootElement, runProcess]);

  const handleDownload = useCallback((content: string, downloadName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const { isDragging, dropZoneProps } = useFileDrop({
    onFile: (text, filename) => {
      setFileDropError(null);
      setFileName(filename.replace(/\.[^.]+$/, ""));
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
      setFileName(file.name.replace(/\.[^.]+$/, ""));
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setInputValue(text);
        setDraft(text);
      };
      reader.onerror = () => {
        setFileDropError("Failed to read file — it may be locked or unreadable.");
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
  const hasResult = !!output?.result && !output?.error;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-col md:flex-row flex-1 min-h-0 w-full">
        {/* Left panel — input */}
        <div
          className="relative flex flex-col flex-1 min-w-0 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark"
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
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[46px]">
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
              <FileUploadButton
                accept=".json,application/json"
                onChange={handleFileUpload}
              />
            </div>
            {!isEmpty && (
              <span className="text-slate-600 text-xs tabular-nums">
                {inputValue.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="JSON input"
            className="flex-1 w-full min-h-[180px] md:min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste JSON to convert..."
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
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[46px]">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              {targetLabel(target)}
            </span>
            {hasResult && (
              <span className="text-slate-600 text-xs tabular-nums">
                {output.lineCount} lines · {output.charCount.toLocaleString()} chars
              </span>
            )}
          </div>

          <div className="flex-1 min-h-[160px] md:min-h-0 overflow-auto custom-scrollbar bg-background-light dark:bg-background-dark">
            {isEmpty ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 px-4">
                Paste JSON on the left and select a format to convert.
              </div>
            ) : output?.error ? (
              <div className="px-4 py-3 text-xs text-red-700 dark:text-red-400 font-mono">
                {output.error}
              </div>
            ) : hasResult ? (
              <CodeBlock
                code={output.result}
                language={targetLanguage(target)}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 px-4">
                Converting…
              </div>
            )}
          </div>

          {output?.warning && (
            <div className="px-4 py-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900">
              ⚠ {output.warning}
            </div>
          )}
        </div>
      </div>

      <ToolbarFooter
        groups={[
          {
            label: "Format",
            ariaLabel: "Format",
            children: (
              <div className="flex flex-wrap gap-1">
                {(["yaml", "typeScript", "csv", "xml"] as const).map((t) => (
                  <PillButton
                    key={t}
                    size="sm"
                    active={target === t}
                    onClick={() => setTarget(t)}
                  >
                    {t === "typeScript" ? "TypeScript" : t.toUpperCase()}
                  </PillButton>
                ))}
              </div>
            ),
          },
          ...(target === "typeScript" || target === "xml"
            ? [
                {
                  label: "Options",
                  ariaLabel: "Options",
                  children: (
                    <>
                      {target === "typeScript" && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <label className="inline-flex cursor-pointer items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={tsExport}
                              onChange={(e) => setTsExport(e.target.checked)}
                              className="h-3 w-3 accent-primary"
                            />
                            <span>Export</span>
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={tsOptional}
                              onChange={(e) => setTsOptional(e.target.checked)}
                              className="h-3 w-3 accent-primary"
                            />
                            <span>Optional fields</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <span>Interface</span>
                            <input
                              type="text"
                              value={tsRootName}
                              onChange={(e) => setTsRootName(e.target.value)}
                              placeholder="Root"
                              className="w-24 rounded border border-border-light bg-panel-light px-2 py-0.5 font-mono text-xs text-slate-900 placeholder:text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                            />
                          </div>
                        </div>
                      )}
                      {target === "xml" && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span>Root element</span>
                          <input
                            type="text"
                            value={xmlRootElement}
                            onChange={(e) => setXmlRootElement(e.target.value)}
                            placeholder="root"
                            className="w-24 rounded border border-border-light bg-panel-light px-2 py-0.5 font-mono text-xs text-slate-900 placeholder:text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                          />
                        </div>
                      )}
                    </>
                  ),
                },
              ]
            : []),
          {
            end: true,
            children: (
              <>
                {hasResult && output?.result ? (
                  <button
                    type="button"
                    onClick={() => {
                      const meta = FORMAT_META[target];
                      handleDownload(
                        output.result,
                        fileName ? `${fileName}.${meta.ext}` : `converted.${meta.ext}`,
                        meta.mime
                      );
                    }}
                    className="rounded-full border border-border-light px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-primary/40 hover:text-primary dark:border-border-dark dark:text-slate-400 dark:hover:border-primary/40 dark:hover:text-primary"
                  >
                    Download .{FORMAT_META[target].ext}
                  </button>
                ) : null}
                <CopyButton
                  value={hasResult && output?.result ? output.result : undefined}
                  label="Copy"
                  variant="primary"
                />
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isEmpty}
                  className="rounded-full px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-red-400"
                >
                  Clear
                </button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export default JsonConverterTool;

