import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CopyButton,
  PanelHeader,
  PillButton,
  ToolbarFooter,
} from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import { CodeBlock } from "../../components/ui/CodeBlock";
import type { IndentStyle } from "../../bindings/IndentStyle";
import type { JsonFormatInput } from "../../bindings/JsonFormatInput";
import type { JsonFormatMode } from "../../bindings/JsonFormatMode";
import type { JsonFormatOutput } from "../../bindings/JsonFormatOutput";

const RUST_COMMAND = "tool_json_format";
const TOOL_ID = "json-formatter";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const MODE_ORDER = ["pretty", "minify", "compact"] as const satisfies readonly JsonFormatMode[];

const MODE_LABELS: Record<JsonFormatMode, string> = {
  pretty: "Pretty",
  minify: "Minify",
  compact: "Inline",
};

const MODE_TOOLTIPS: Record<JsonFormatMode, string> = {
  pretty: "Multi-line with indentation",
  minify: "Single line, no whitespace",
  compact: "Single line with readable spacing",
};

function JsonFormatterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [inputValue, setInputValue] = useState("");
  useRestoreStringDraft(TOOL_ID, setInputValue);
  const [mode, setMode] = useState<JsonFormatMode>("pretty");
  const [indent, setIndent] = useState<IndentStyle>("spaces2");
  const [sortKeys, setSortKeys] = useState(false);
  const [output, setOutput] = useState<JsonFormatOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      value: string,
      currentMode: JsonFormatMode,
      currentIndent: IndentStyle,
      currentSortKeys: boolean
    ) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: JsonFormatInput = {
          value: trimmed,
          mode: currentMode,
          indent: currentIndent,
          sortKeys: currentSortKeys,
        };
        const result = (await callTool(RUST_COMMAND, payload, { skipHistory: true })) as JsonFormatOutput;
        setOutput(result);
        if (result.isValid) {
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
          isValid: false,
          lineCount: 0,
          charCount: 0,
          sizeBytes: 0,
          sizeOriginalBytes: trimmed.length,
          compressionRatio: null,
          error: message,
          errorLine: null,
          errorColumn: null,
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
      runProcess(inputValue, mode, indent, sortKeys);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, mode, indent, sortKeys, runProcess]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setDraft("");
    setOutput(null);
  }, [setDraft]);

  const isEmpty = inputValue.trim() === "";
  const showValidBadge = !isEmpty && output != null;
  const isValid = output?.isValid === true;
  const outputMeta =
    isValid && output
      ? [
          `${output.lineCount} lines`,
          `${output.charCount.toLocaleString()} chars`,
          `${output.sizeBytes.toLocaleString()} bytes`,
          output.compressionRatio != null &&
          output.compressionRatio > 0
            ? `${output.compressionRatio.toFixed(1)}× smaller`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : undefined;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark">
          <PanelHeader
            label="Input"
            meta={
              !isEmpty
                ? `${inputValue.length.toLocaleString()} chars`
                : undefined
            }
          />
          <textarea
            aria-label="JSON input"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste JSON here..."
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setInputValue(v);
              setDraft(v);
            }}
          />
        </div>

        {/* Right panel — output */}
        <div className="flex flex-col flex-1 min-w-0">
          <PanelHeader
            label="Output"
            badge={
              showValidBadge
                ? {
                    text: isValid ? "✓ Valid JSON" : "✗ Invalid JSON",
                    variant: isValid ? "success" : "error",
                  }
                : undefined
            }
            meta={outputMeta}
          />

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 pt-4 pb-4">
            {isEmpty && (
              <p className="text-slate-600 text-sm m-0">
                Formatted JSON will appear here
              </p>
            )}
            {!isEmpty && output && !output.isValid && (
              <div className="text-red-600 dark:text-red-400 text-xs font-mono">
                {output.errorLine != null && output.errorColumn != null && (
                  <span className="text-slate-500">
                    Line {output.errorLine}, Column {output.errorColumn}:{" "}
                  </span>
                )}
                {output.error ?? "Invalid JSON"}
              </div>
            )}
            {isValid && output?.result && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <CodeBlock
                  code={output.result}
                  language="json"
                  maxHeight="100%"
                  showCopyButton
                  className="h-full min-h-0 flex flex-col overflow-hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ToolbarFooter
        className="gap-0"
        groups={[
          {
            label: "Mode",
            children: (
              <>
                {MODE_ORDER.map((m) => (
                  <div key={m} className="relative group">
                    <PillButton
                      active={mode === m}
                      onClick={() => setMode(m)}
                      size="sm"
                      shape="full"
                    >
                      {MODE_LABELS[m]}
                    </PillButton>
                    <span
                      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-100 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700"
                      role="tooltip"
                    >
                      {MODE_TOOLTIPS[m]}
                    </span>
                  </div>
                ))}
              </>
            ),
          },
          {
            label: "Indent",
            children: (
              <div
                className={
                  mode !== "pretty" ? "pointer-events-none opacity-40" : ""
                }
              >
                {(
                  [
                    { value: "spaces2" as const, label: "2 spaces" },
                    { value: "spaces4" as const, label: "4 spaces" },
                    { value: "tab" as const, label: "Tab" },
                  ] as const
                ).map(({ value, label }) => (
                  <PillButton
                    key={value}
                    active={indent === value}
                    onClick={() => setIndent(value)}
                    size="sm"
                    shape="full"
                  >
                    {label}
                  </PillButton>
                ))}
              </div>
            ),
          },
          {
            label: "Options",
            children: (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Sort keys"
                  checked={sortKeys}
                  onChange={(e) => setSortKeys(e.target.checked)}
                  className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Sort keys
                </span>
              </label>
            ),
          },
          {
            end: true,
            children: (
              <>
                {output?.isValid && output.result ? (
                  <CopyButton
                    value={output.result}
                    label="Copy"
                    variant="outline"
                    className="px-3 py-2"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-border-light bg-panel-light px-4 py-2 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
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

export default JsonFormatterTool;
