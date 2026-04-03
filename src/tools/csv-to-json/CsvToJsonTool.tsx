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
import type { CsvOutputFormat } from "../../bindings/CsvOutputFormat";
import type { CsvToJsonInput } from "../../bindings/CsvToJsonInput";
import type { CsvToJsonOutput } from "../../bindings/CsvToJsonOutput";

const TOOL_ID = "csv-to-json";
const RUST_COMMAND = "tool_csv_to_json";
const DEBOUNCE_MS = 300;

function CsvToJsonTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
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
  const [fileName, setFileName] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runConvert = useCallback(
    async (
      value: string,
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
        const payload: CsvToJsonInput = {
          value: trimmed,
          hasHeaders: currentHasHeaders,
          delimiter: currentDelimiter,
          outputFormat: currentFormat,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as CsvToJsonOutput;
        setOutput(result);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : String(e ?? "Convert failed");
        setOutput({
          result: "",
          rowCount: 0,
          columnCount: 0,
          error: message,
        });
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
      runConvert(inputValue, hasHeaders, delimiter, outputFormat);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, hasHeaders, delimiter, outputFormat, runConvert]);

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
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
    setOutput(null);
  }, [setDraft]);

  const handleConvertNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    runConvert(inputValue, hasHeaders, delimiter, outputFormat);
  }, [inputValue, hasHeaders, delimiter, outputFormat, runConvert]);

  const isEmpty = inputValue.trim() === "";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-col md:flex-row flex-1 min-h-0 w-full">
        {/* Left panel — CSV input */}
        <div className="flex flex-col flex-1 min-w-0 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {fileName ?? "Input"}
              </span>
              {fileName ? (
                <button
                  type="button"
                  onClick={() => {
                    setFileName(null);
                    setInputValue("");
                    setDraft("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              ) : null}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  accept=".csv,text/csv"
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
            aria-label="CSV input"
            className="flex-1 w-full min-h-[180px] md:min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder={["name,email,age", "Alice,alice@example.com,30", "Bob,bob@example.com,25"].join(
              "\n"
            )}
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setInputValue(v);
              setDraft(v);
            }}
          />
        </div>

        {/* Right panel — JSON output */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              OUTPUT (JSON)
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {output
                  ? `${output.rowCount.toLocaleString()} rows · ${output.columnCount.toLocaleString()} columns`
                  : "Converting..."}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-background-light dark:bg-background-dark">
            {output?.result ? (
              <CodeBlock
                language="json"
                code={output.result}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 px-4">
                {isEmpty
                  ? "Enter CSV on the left to see JSON output here."
                  : "Converting..."}
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
          {/* Headers toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider">
              Headers
            </span>
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

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-border-light dark:bg-border-dark self-center mx-1" />

          {/* Format group */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider">
              Format
            </span>
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
            {output?.result && !output.error ? (
              <button
                type="button"
                onClick={() =>
                  handleDownload(
                    output.result,
                    fileName
                      ? `${fileName.replace(/\.[^.]+$/, "")}.json`
                      : "output.json",
                    "application/json"
                  )
                }
                className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
              >
                Download .json
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

export default CsvToJsonTool;

