import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { CodeBlock } from "../../components/ui/CodeBlock";

const RUST_COMMAND = "tool_json_convert";
const DEBOUNCE_MS = 200;

type ConversionTarget = "yaml" | "typeScript" | "csv" | "xml";

interface JsonConvertInputPayload {
  value: string;
  target: ConversionTarget;
  tsRootName?: string;
  tsExport?: boolean;
  tsOptionalFields?: boolean;
  xmlRootElement?: string;
}

interface JsonConvertOutputPayload {
  result: string;
  isValidJson: boolean;
  target: ConversionTarget;
  error?: string | null;
  warning?: string | null;
  lineCount: number;
  charCount: number;
}

function targetLabel(target: ConversionTarget): string {
  switch (target) {
    case "yaml":
      return "YAML OUTPUT";
    case "typeScript":
      return "TYPESCRIPT OUTPUT";
    case "csv":
      return "CSV OUTPUT";
    case "xml":
      return "XML OUTPUT";
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
  const [inputValue, setInputValue] = useState("");
  const [target, setTarget] = useState<ConversionTarget>("yaml");
  const [tsRootName, setTsRootName] = useState("Root");
  const [tsExport, setTsExport] = useState(true);
  const [tsOptional, setTsOptional] = useState(false);
  const [xmlRootElement, setXmlRootElement] = useState("root");
  const [output, setOutput] = useState<JsonConvertOutputPayload | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const payload: JsonConvertInputPayload = {
          value: trimmed,
          target: currentTarget,
        };
        if (currentTarget === "typeScript") {
          payload.tsRootName = options.tsRootName || "Root";
          payload.tsExport = options.tsExport;
          payload.tsOptionalFields = options.tsOptional;
        }
        if (currentTarget === "xml") {
          payload.xmlRootElement = options.xmlRootElement || "root";
        }
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as JsonConvertOutputPayload;
        setOutput(result);
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
    []
  );

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

  const handleClear = useCallback(() => {
    setInputValue("");
    setOutput(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output?.result) return;
    try {
      await navigator.clipboard.writeText(output.result);
    } catch {
      // ignore
    }
  }, [output]);

  const isEmpty = inputValue.trim() === "";
  const hasResult = !!output?.result;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              INPUT JSON
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {inputValue.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="JSON input"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste JSON to convert..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        {/* Right panel — output */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              {targetLabel(target)}
            </span>
            {output && output.result && (
              <span className="text-slate-600 text-xs">
                {output.lineCount} lines · {output.charCount.toLocaleString()} chars
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 pt-4 pb-4">
            {isEmpty && (
              <p className="text-slate-600 text-sm m-0">
                Paste JSON and select a format to convert.
              </p>
            )}

            {!isEmpty && output?.error && (
              <div className="text-red-400 text-sm font-mono p-2">
                {output.error}
              </div>
            )}

            {!isEmpty && !output?.error && hasResult && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <CodeBlock
                  code={output.result}
                  language={targetLanguage(target)}
                  maxHeight="100%"
                  showCopyButton
                  className="h-full min-h-0 flex flex-col overflow-hidden"
                />
              </div>
            )}
          </div>

          {output?.warning && (
            <div className="bg-amber-500/5 border-t border-amber-500/20 text-amber-500/70 text-xs px-4 py-2">
              ⚠ {output.warning}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* FORMAT group */}
        <div className="flex flex-col gap-1" role="group" aria-label="Format">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Format
          </span>
          <div className="flex gap-1">
            {(["yaml", "typeScript", "csv", "xml"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
                  target === t
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-border-light dark:border-border-dark"
                }`}
              >
                {t === "typeScript" ? "TypeScript" : t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-2" />

        {/* OPTIONS group */}
        {(target === "typeScript" || target === "xml") && (
          <>
            <div className="flex flex-col gap-1" role="group" aria-label="Options">
              <span className="text-slate-600 text-xs uppercase tracking-wider">
                Options
              </span>
              {target === "typeScript" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={tsExport}
                      onChange={(e) => setTsExport(e.target.checked)}
                      className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
                    />
                    Export
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={tsOptional}
                      onChange={(e) => setTsOptional(e.target.checked)}
                      className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
                    />
                    Optional fields
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-xs">Interface</span>
                    <input
                      type="text"
                      value={tsRootName}
                      onChange={(e) => setTsRootName(e.target.value)}
                      placeholder="Root"
                      className="w-24 bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}
              {target === "xml" && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">Root element</span>
                  <input
                    type="text"
                    value={xmlRootElement}
                    onChange={(e) => setXmlRootElement(e.target.value)}
                    placeholder="root"
                    className="w-24 bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>
            <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-2" />
          </>
        )}

        {/* ACTIONS group */}
        <div className="flex flex-col gap-1 ml-auto" role="group" aria-label="Actions">
          <div className="flex items-center gap-2">
            {hasResult && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Copy
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default JsonConverterTool;

