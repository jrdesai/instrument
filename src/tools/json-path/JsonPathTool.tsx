import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { JsonPathInput } from "../../bindings/JsonPathInput";
import type { JsonPathMatch } from "../../bindings/JsonPathMatch";
import type { JsonPathOutput } from "../../bindings/JsonPathOutput";

const RUST_COMMAND = "tool_json_path";
const TOOL_ID = "json-path";
const DEBOUNCE_MS = 300;
const HISTORY_DEBOUNCE_MS = 1500;

function isJsonPathDraft(
  raw: unknown
): raw is { input: string; path: string } {
  if (typeof raw !== "object" || raw === null) return false;
  const o = raw as Record<string, unknown>;
  return typeof o.input === "string" && typeof o.path === "string";
}

function typeBadgeClasses(t: string): string {
  switch (t) {
    case "string":
      return "bg-emerald-500/10 text-emerald-400";
    case "number":
      return "bg-amber-500/10 text-amber-400";
    case "boolean":
      return "bg-purple-500/10 text-purple-400";
    case "null":
      return "bg-slate-500/10 text-slate-400";
    case "object":
      return "bg-blue-500/10 text-blue-400";
    case "array":
      return "bg-cyan-500/10 text-cyan-400";
    default:
      return "bg-slate-500/10 text-slate-400";
  }
}

function JsonPathTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [query, setQuery] = useState("");
  const [jsonInput, setJsonInput] = useState("");

  useRestoreDraft(TOOL_ID, (raw) => {
    if (!isJsonPathDraft(raw)) return;
    setJsonInput(raw.input);
    setQuery(raw.path);
  });
  const [output, setOutput] = useState<JsonPathOutput | null>(null);
  const [fullDocOpen, setFullDocOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (currentQuery: string, currentJson: string) => {
      const q = currentQuery.trim();
      const v = currentJson.trim();
      if (q === "" && v === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: JsonPathInput = {
          value: currentJson,
          query: currentQuery,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as JsonPathOutput;
        setOutput(result);
        if (result.isValidJson && result.isValidQuery) {
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
          e instanceof Error ? e.message : String(e ?? "JSONPath query failed");
        setOutput({
          isValidJson: false,
          isValidQuery: false,
          matches: [],
          matchCount: 0,
          error: message,
          annotatedDocument: null,
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
    debounceRef.current = setTimeout(() => {
      runProcess(query, jsonInput);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, jsonInput, runProcess]);

  const handleClear = useCallback(() => {
    setQuery("");
    setJsonInput("");
    setDraft({ input: "", path: "" });
    setOutput(null);
    setFullDocOpen(false);
  }, [setDraft]);

  const allMatchesText = useMemo(() => {
    if (!output?.matches?.length) return "";
    return `[${output.matches.map((m) => m.value).join(",")}]`;
  }, [output?.matches]);

  const isEmpty = query.trim() === "" && jsonInput.trim() === "";
  const hasMatches = (output?.matchCount ?? 0) > 0;
  const matchCount = output?.matchCount ?? 0;

  const showError = Boolean(output?.error);

  const matches = output?.matches ?? [];

  const renderValue = (m: JsonPathMatch) => {
    if (m.valueType === "object" || m.valueType === "array") {
      return (
        <CodeBlock
          code={m.value}
          language="json"
          maxHeight="120px"
          showCopyButton
        />
      );
    }
    return (
      <div className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200 break-all">
        {m.value}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Row 1 — Query input */}
      <div className="flex items-stretch border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 h-14">
        <div className="flex items-center px-3 py-2 border-r border-border-light dark:border-border-dark rounded-tl-lg bg-panel-light dark:bg-panel-dark">
          <span className="text-primary font-mono text-sm font-bold">$</span>
        </div>
        <input
          aria-label="JSONPath query"
          className="flex-1 bg-transparent px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-500 focus:outline-none"
          placeholder=".store.book[*].title"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setDraft({ input: jsonInput, path: v });
          }}
        />
        {hasMatches && (
          <div className="flex items-center px-3">
            <span className="bg-primary/10 text-primary text-xs px-2 rounded">
              {matchCount} {matchCount === 1 ? "match" : "matches"}
            </span>
          </div>
        )}
      </div>

      {/* Row 2 — JSON input + Results */}
      <div className="flex flex-1 min-h-0">
        {/* Left — JSON document input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[41px]">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              JSON DOCUMENT
            </span>
            {jsonInput && (
              <span className="text-slate-600 text-xs">
                {jsonInput.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="JSON document"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste JSON document..."
            value={jsonInput}
            onChange={(e) => {
              const v = e.target.value;
              setJsonInput(v);
              setDraft({ input: v, path: query });
            }}
          />
        </div>

        {/* Right — Results */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[41px]">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              RESULTS
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4">
            {/* Empty state */}
            {isEmpty && (
              <div className="flex flex-col items-start justify-center h-full text-slate-600 text-sm space-y-4">
                <p>
                  Enter a JSONPath query and paste a JSON document to see
                  matches.
                </p>
                <div className="text-slate-700 text-xs space-y-1">
                  <p className="font-semibold">Common patterns:</p>
                  <p>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      $.store.book[*].author
                    </span>{" "}
                    — All authors
                  </p>
                  <p>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      $..author
                    </span>{" "}
                    — All authors (recursive)
                  </p>
                  <p>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      $.store.book[0]
                    </span>{" "}
                    — First book
                  </p>
                  <p>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      $.store.book[-1]
                    </span>{" "}
                    — Last book
                  </p>
                  <p>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      $.store.book[?(@.price &lt; 10)]
                    </span>{" "}
                    — Books under $10
                  </p>
                  <p>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      $..book[?(@.isbn)]
                    </span>{" "}
                    — Books with ISBN
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {!isEmpty && showError && (
              <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap mb-3">
                {output?.error}
              </div>
            )}

            {/* No matches */}
            {!isEmpty &&
              !showError &&
              output &&
              output.matchCount === 0 && (
                <div className="space-y-2">
                  <p className="text-slate-500 text-sm">No matches found</p>
                  <p className="font-mono text-xs text-slate-600">
                    Query: ${query || "(empty)"}
                  </p>
                </div>
              )}

            {/* Matches */}
            {!isEmpty && !showError && hasMatches && (
              <div className="space-y-3">
                <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold">
                  {matchCount} {matchCount === 1 ? "match" : "matches"}
                </p>
                <div className="space-y-2">
                  {matches.map((m) => (
                    <div
                      key={m.index}
                      className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        <span className="bg-primary/10 text-primary text-xs font-mono px-1.5 rounded shrink-0">
                          #{m.index + 1}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400 text-xs truncate min-w-0 flex-1">
                          {m.path}
                        </span>
                        <CopyButton
                          value={m.value}
                          variant="icon"
                          aria-label={`Copy match ${m.index + 1}`}
                          className="shrink-0"
                        />
                        <span
                          className={`shrink-0 text-xs px-1.5 rounded ${typeBadgeClasses(
                            m.valueType
                          )}`}
                        >
                          {m.valueType}
                        </span>
                      </div>
                      {renderValue(m)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3 — Full Document collapsible */}
      {hasMatches && output?.annotatedDocument && (
        <div className="border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
          <button
            type="button"
            onClick={() => setFullDocOpen((o) => !o)}
            className="flex items-center justify-between w-full px-4 py-2 text-left text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm" aria-hidden>
                article
              </span>
              Full Document
            </span>
            <span className="material-symbols-outlined text-sm" aria-hidden>
              {fullDocOpen ? "expand_less" : "expand_more"}
            </span>
          </button>
          {fullDocOpen && (
            <div className="px-4 pb-3">
              <CodeBlock
                code={output.annotatedDocument}
                language="json"
                maxHeight="200px"
                showCopyButton
              />
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="flex items-center gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {hasMatches && (
          <CopyButton
            value={allMatchesText || undefined}
            label="Copy All"
            variant="primary"
          />
        )}
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        >
          Clear
        </button>
      </footer>
    </div>
  );
}

export default JsonPathTool;

