import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";

const RUST_COMMAND = "tool_url_parse";
const TOOL_ID = "url-parser";
const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;

interface UrlParseInputPayload {
  value: string;
}

interface QueryParamPayload {
  key: string;
  value: string;
}

interface UrlParseOutputPayload {
  scheme?: string | null;
  username?: string | null;
  password?: string | null;
  host?: string | null;
  port?: number | null;
  path?: string | null;
  query?: string | null;
  params: QueryParamPayload[];
  fragment?: string | null;
  origin?: string | null;
  error?: string | null;
}

const FIELD_GROUPS: { label: string; key: keyof UrlParseOutputPayload }[][] = [
  [
    { label: "Scheme", key: "scheme" },
    { label: "Username", key: "username" },
    { label: "Password", key: "password" },
  ],
  [
    { label: "Host", key: "host" },
    { label: "Port", key: "port" },
  ],
  [
    { label: "Path", key: "path" },
    { label: "Query", key: "query" },
    { label: "Fragment", key: "fragment" },
    { label: "Origin", key: "origin" },
  ],
];

function fieldValue(
  output: UrlParseOutputPayload | null,
  key: keyof UrlParseOutputPayload
): string {
  if (!output || key === "params" || key === "error") return "—";
  const v = output[key];
  if (v == null || v === "") return "—";
  if (typeof v === "number") return String(v);
  return String(v);
}

function UrlParserTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<UrlParseOutputPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy URL");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      setIsLoading(true);
      try {
        const payload: UrlParseInputPayload = { value: trimmed };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as UrlParseOutputPayload;
        setOutput(result);
        if (!result.error) {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : "Parse failed";
        setOutput({
          params: [],
          error: message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(input);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, runProcess]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput(null);
  }, []);

  const handleCopyUrl = useCallback(async () => {
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy URL"), COPIED_DURATION_MS);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy URL"), COPIED_DURATION_MS);
    }
  }, [input]);

  const hasError = output?.error != null;
  const hasResult = output != null && !hasError;

  return (
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-dark bg-panel-dark shrink-0">
        <h2 className="text-lg font-semibold text-slate-100">URL Parser</h2>
        <p className="text-sm text-slate-400 mt-0.5">Parse and inspect URLs</p>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-b border-border-dark shrink-0">
        <input
          type="text"
          aria-label="URL to parse"
          className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg font-mono text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="https://example.com/..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4">
        {hasError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
            {output?.error}
          </div>
        )}

        {hasResult && output && (
          <>
            <div className="space-y-4">
              {FIELD_GROUPS.map((group, gi) => (
                <div
                  key={gi}
                  className="border border-border-dark rounded-lg overflow-hidden bg-panel-dark"
                >
                  <table className="w-full text-sm">
                    <tbody>
                      {group.map(({ label, key }) => (
                        <tr
                          key={key}
                          className="border-b border-border-dark last:border-b-0"
                        >
                          <td className="w-32 py-2 px-3 text-slate-400 font-medium align-top">
                            {label}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-200 break-all">
                            {fieldValue(output, key)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {output.params.length > 0 && (
              <div className="mt-4">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                  Query params
                </div>
                <div className="border border-border-dark rounded-lg overflow-hidden bg-panel-dark">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-dark bg-background-dark/50">
                        <th className="text-left py-2 px-3 text-slate-400 font-medium">
                          Key
                        </th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {output.params.map((p, i) => (
                        <tr
                          key={i}
                          className="border-b border-border-dark last:border-b-0"
                        >
                          <td className="py-2 px-3 font-mono text-slate-200">
                            {p.key}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-200 break-all">
                            {p.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!input.trim() && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span
              className="material-symbols-outlined text-6xl text-slate-700 mb-4"
              aria-hidden
            >
              link
            </span>
            <p className="text-slate-600 text-sm">
              Enter a URL to parse and inspect its components
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-dark bg-panel-dark shrink-0">
        {isLoading && (
          <span className="text-xs text-primary mr-2">Parsing…</span>
        )}
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 text-sm text-slate-400 border border-border-dark rounded-lg hover:text-slate-200 hover:border-slate-500 transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleCopyUrl}
          disabled={!input}
          className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {copyLabel}
        </button>
      </footer>
    </div>
  );
}

export default UrlParserTool;
