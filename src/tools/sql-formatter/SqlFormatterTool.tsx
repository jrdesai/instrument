import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { CodeBlock } from "../../components/ui/CodeBlock";

type SqlIndentStyle = "spaces2" | "spaces4" | "tab";
type SqlKeywordCase = "upper" | "lower" | "preserve";

const RUST_COMMAND = "tool_sql_format";
const DEBOUNCE_MS = 300;
const COPIED_DURATION_MS = 1500;

interface SqlFormatInputPayload {
  value: string;
  indent: SqlIndentStyle;
  keywordCase: SqlKeywordCase;
}

interface SqlFormatOutputPayload {
  result: string;
  lineCount: number;
  charCount: number;
  error?: string | null;
}

function SqlFormatterTool() {
  const [inputValue, setInputValue] = useState("");
  const [indent, setIndent] = useState<SqlIndentStyle>("spaces2");
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>("upper");
  const [output, setOutput] = useState<SqlFormatOutputPayload | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runFormat = useCallback(
    async (value: string, currentIndent: SqlIndentStyle, currentCase: SqlKeywordCase) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: SqlFormatInputPayload = {
          value: trimmed,
          indent: currentIndent,
          keywordCase: currentCase,
        };
        const result = (await callTool(RUST_COMMAND, payload)) as SqlFormatOutputPayload;
        setOutput(result);
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
      runFormat(inputValue, indent, keywordCase);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, indent, keywordCase, runFormat]);

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

  const handleFormatNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    runFormat(inputValue, indent, keywordCase);
  }, [inputValue, indent, keywordCase, runFormat]);

  const isEmpty = inputValue.trim() === "";

  return (
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-dark bg-panel-dark shrink-0">
            <span className="text-slate-400 text-xs uppercase tracking-wider">
              INPUT
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {inputValue.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="SQL input"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder={`SELECT *\nFROM users\nWHERE id = 1;`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        {/* Right panel — output */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-dark bg-panel-dark shrink-0">
            <span className="text-slate-400 text-xs uppercase tracking-wider">
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
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-background-dark">
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
            <div className="px-4 py-2 text-xs text-red-400 bg-red-950/40 border-t border-red-900">
              {output.error}
            </div>
          )}
        </div>
      </div>

      {/* Footer — options + actions */}
      <footer className="shrink-0 border-t border-border-dark bg-panel-dark px-4 py-3">
        <div className="flex items-start gap-6 text-xs text-slate-400">
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
          <div className="w-px h-6 bg-border-dark self-center mx-1" />

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
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleFormatNow}
              disabled={isEmpty}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Format
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!output?.result}
              className="px-3 py-1.5 rounded-md border border-border-dark bg-panel-dark text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            >
              {copyLabel}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isEmpty && !output}
              className="px-3 py-1.5 rounded-md border border-border-dark bg-panel-dark text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
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

