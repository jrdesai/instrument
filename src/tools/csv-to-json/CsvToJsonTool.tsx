import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { CodeBlock } from "../../components/ui/CodeBlock";

type CsvOutputFormat = "arrayOfObjects" | "arrayOfArrays";

const RUST_COMMAND = "tool_csv_to_json";
const DEBOUNCE_MS = 300;
const COPIED_DURATION_MS = 1500;

interface CsvToJsonInputPayload {
  value: string;
  hasHeaders: boolean;
  delimiter: string;
  outputFormat: CsvOutputFormat;
}

interface CsvToJsonOutputPayload {
  result: string;
  rowCount: number;
  columnCount: number;
  error?: string | null;
}

function CsvToJsonTool() {
  const [inputValue, setInputValue] = useState(
    ["name,email,age", "Alice,alice@example.com,30", "Bob,bob@example.com,25"].join("\n")
  );
  const [hasHeaders, setHasHeaders] = useState(true);
  const [delimiter, setDelimiter] = useState<"," | "\t" | "|" | ";">(",");
  const [outputFormat, setOutputFormat] = useState<CsvOutputFormat>("arrayOfObjects");
  const [output, setOutput] = useState<CsvToJsonOutputPayload | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
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
        const payload: CsvToJsonInputPayload = {
          value: trimmed,
          hasHeaders: currentHasHeaders,
          delimiter: currentDelimiter,
          outputFormat: currentFormat,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as CsvToJsonOutputPayload;
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

  const handleCopy = useCallback(async () => {
    if (!output?.result) return;
    try {
      await navigator.clipboard.writeText(output.result);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), COPIED_DURATION_MS);
    } catch {
      // ignore
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setOutput(null);
  }, []);

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
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — CSV input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              INPUT (CSV)
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {inputValue.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="CSV input"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder={["name,email,age", "Alice,alice@example.com,30", "Bob,bob@example.com,25"].join(
              "\n"
            )}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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
            <div className="px-4 py-2 text-xs text-red-400 bg-red-950/40 border-t border-red-900">
              {output.error}
            </div>
          )}
        </div>
      </div>

      {/* Footer — options + actions */}
      <footer className="shrink-0 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <div className="flex items-start gap-6 text-xs text-slate-500 dark:text-slate-400">
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
          <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-1" />

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
          <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-1" />

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
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleConvertNow}
              disabled={isEmpty}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Convert
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!output?.result}
              className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              {copyLabel}
            </button>
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

