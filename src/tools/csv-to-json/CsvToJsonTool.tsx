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
import type { CsvOutputFormat } from "../../bindings/CsvOutputFormat";
import type { CsvToJsonInput } from "../../bindings/CsvToJsonInput";
import type { CsvToJsonOutput } from "../../bindings/CsvToJsonOutput";
import type { JsonToCsvInput } from "../../bindings/JsonToCsvInput";
import type { JsonToCsvOutput } from "../../bindings/JsonToCsvOutput";

const TOOL_ID = "csv-to-json";
const DEBOUNCE_MS = 300;

function CsvToJsonTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [direction, setDirection] = useState<"csv-to-json" | "json-to-csv">("csv-to-json");
  const [inputValue, setInputValue] = useState(
    () =>
      ["name,email,age", "Alice,alice@example.com,30", "Bob,bob@example.com,25"].join(
        "\n"
      )
  );
  useRestoreStringDraft(TOOL_ID, setInputValue);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [delimiter, setDelimiter] = useState<"," | "\t" | "|" | ";">(",");
  const [outputFormat, setOutputFormat] = useState<CsvOutputFormat>("arrayOfObjects");
  const [output, setOutput] = useState<CsvToJsonOutput | null>(null);
  const [jsonToCsvOutput, setJsonToCsvOutput] = useState<JsonToCsvOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runConvert = useCallback(
    async (
      value: string,
      currentDirection: "csv-to-json" | "json-to-csv",
      currentHasHeaders: boolean,
      currentDelimiter: string,
      currentFormat: CsvOutputFormat
    ) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        if (currentDirection === "csv-to-json") {
          const payload: CsvToJsonInput = {
            value: trimmed,
            hasHeaders: currentHasHeaders,
            delimiter: currentDelimiter,
            outputFormat: currentFormat,
          };
          const result = (await callTool("tool_csv_to_json", payload)) as CsvToJsonOutput;
          setOutput(result);
          setJsonToCsvOutput(null);
        } else {
          const payload: JsonToCsvInput = {
            value: trimmed,
            delimiter: currentDelimiter,
          };
          const result = (await callTool("tool_json_to_csv", payload)) as JsonToCsvOutput;
          setJsonToCsvOutput(result);
          setOutput(null);
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : String(e ?? "Convert failed");
        if (currentDirection === "csv-to-json") {
          setOutput({
            result: "",
            rowCount: 0,
            columnCount: 0,
            error: message,
          });
        } else {
          setJsonToCsvOutput({
            result: "",
            rowCount: 0,
            columnCount: 0,
            warning: null,
            error: message,
          });
        }
      }
    },
    []
  );

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
      runConvert(inputValue, direction, hasHeaders, delimiter, outputFormat);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, direction, hasHeaders, delimiter, outputFormat, runConvert]);

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
    setJsonToCsvOutput(null);
  }, [setDraft]);

  const handleConvertNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    runConvert(inputValue, direction, hasHeaders, delimiter, outputFormat);
  }, [inputValue, direction, hasHeaders, delimiter, outputFormat, runConvert]);

  const handleDirectionChange = useCallback(
    (newDir: "csv-to-json" | "json-to-csv") => {
      if (newDir === direction) return;
      setDirection(newDir);
      setInputValue("");
      setDraft("");
      setFileName(null);
      setFileDropError(null);
      setOutput(null);
      setJsonToCsvOutput(null);
    },
    [direction, setDraft]
  );

  const isEmpty = inputValue.trim() === "";
  const activeResult = direction === "csv-to-json" ? output : jsonToCsvOutput;
  const outputLanguage = direction === "csv-to-json" ? "json" : "bash";
  const inputLabel = direction === "csv-to-json" ? "CSV" : "JSON";
  const outputLabel = direction === "csv-to-json" ? "JSON" : "CSV";
  const uploadAccept = direction === "csv-to-json" ? ".csv,text/csv" : ".json,application/json,text/plain";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="shrink-0 border-b border-border-light dark:border-border-dark px-4 py-2 bg-panel-light dark:bg-panel-dark">
        <div className="inline-flex rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
          <button
            type="button"
            onClick={() => handleDirectionChange("csv-to-json")}
            className={`px-3 py-1.5 text-xs font-semibold ${direction === "csv-to-json" ? "bg-primary text-white" : "bg-transparent text-slate-500 dark:text-slate-300"}`}
          >
            CSV → JSON
          </button>
          <button
            type="button"
            onClick={() => handleDirectionChange("json-to-csv")}
            className={`px-3 py-1.5 text-xs font-semibold border-l border-border-light dark:border-border-dark ${direction === "json-to-csv" ? "bg-primary text-white" : "bg-transparent text-slate-500 dark:text-slate-300"}`}
          >
            JSON → CSV
          </button>
        </div>
      </div>
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
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[41px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {fileName ?? "Input"}
              </span>
              {fileName ? (
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
              ) : null}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-0.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  accept={uploadAccept}
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
            aria-label={`${inputLabel} input`}
            className="flex-1 w-full min-h-[180px] md:min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder={direction === "csv-to-json"
              ? ["name,email,age", "Alice,alice@example.com,30", "Bob,bob@example.com,25"].join("\n")
              : JSON.stringify(
                  [
                    { name: "Alice", age: 30 },
                    { name: "Bob", age: 25 },
                  ],
                  null,
                  2
                )}
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
              OUTPUT ({outputLabel})
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {activeResult
                  ? `${activeResult.rowCount.toLocaleString()} rows · ${activeResult.columnCount.toLocaleString()} columns`
                  : "Converting..."}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-background-light dark:bg-background-dark">
            {activeResult?.result ? (
              <CodeBlock
                language={outputLanguage}
                code={activeResult.result}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 px-4">
                {isEmpty
                  ? `Enter ${inputLabel} on the left to see ${outputLabel} output here.`
                  : "Converting..."}
              </div>
            )}
          </div>
          {direction === "json-to-csv" && jsonToCsvOutput?.warning && !jsonToCsvOutput.error && (
            <div className="px-4 py-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900">
              {jsonToCsvOutput.warning}
            </div>
          )}
          {activeResult?.error && (
            <div className="px-4 py-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900">
              {activeResult.error}
            </div>
          )}
        </div>
      </div>

      {/* Footer — options + actions */}
      <footer className="shrink-0 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 text-xs text-slate-500 dark:text-slate-400">
          {direction === "csv-to-json" && (
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider">Headers</span>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-primary"
                  checked={hasHeaders}
                  onChange={(e) => setHasHeaders(e.target.checked)}
                />
                <span>First row is header</span>
              </label>
            </div>
          )}

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-border-light dark:bg-border-dark self-center mx-1" />

          {/* Delimiter group */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider">
              Delimiter
            </span>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="csv-delimiter"
                  className="h-3 w-3 accent-primary"
                  checked={delimiter === ","}
                  onChange={() => setDelimiter(",")}
                />
                <span>Comma</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="csv-delimiter"
                  className="h-3 w-3 accent-primary"
                  checked={delimiter === "\t"}
                  onChange={() => setDelimiter("\t")}
                />
                <span>Tab</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="csv-delimiter"
                  className="h-3 w-3 accent-primary"
                  checked={delimiter === "|"}
                  onChange={() => setDelimiter("|")}
                />
                <span>Pipe</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="csv-delimiter"
                  className="h-3 w-3 accent-primary"
                  checked={delimiter === ";"}
                  onChange={() => setDelimiter(";")}
                />
                <span>Semicolon</span>
              </label>
            </div>
          </div>

          {direction === "csv-to-json" && (
            <>
              <div className="hidden md:block w-px h-6 bg-border-light dark:bg-border-dark self-center mx-1" />
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Format</span>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="csv-format"
                      className="h-3 w-3 accent-primary"
                      checked={outputFormat === "arrayOfObjects"}
                      onChange={() => setOutputFormat("arrayOfObjects")}
                    />
                    <span>Array of Objects</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="csv-format"
                      className="h-3 w-3 accent-primary"
                      checked={outputFormat === "arrayOfArrays"}
                      onChange={() => setOutputFormat("arrayOfArrays")}
                    />
                    <span>Array of Arrays</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={handleConvertNow}
              disabled={isEmpty}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Convert
            </button>
            {activeResult?.result && !activeResult.error ? (
              <button
                type="button"
                onClick={() =>
                  handleDownload(
                    activeResult.result,
                    fileName
                      ? `${fileName.replace(/\.[^.]+$/, "")}.${direction === "csv-to-json" ? "json" : "csv"}`
                      : `output.${direction === "csv-to-json" ? "json" : "csv"}`,
                    direction === "csv-to-json" ? "application/json" : "text/csv"
                  )
                }
                className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
              >
                Download .{direction === "csv-to-json" ? "json" : "csv"}
              </button>
            ) : null}
            <CopyButton
              value={
                activeResult?.result && !activeResult.error ? activeResult.result : undefined
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

export default CsvToJsonTool;

