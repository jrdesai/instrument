import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CopyButton, PillButton, ToolbarFooter } from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { HexInput } from "../../bindings/HexInput";
import type { HexMode } from "../../bindings/HexMode";
import type { HexOutput } from "../../bindings/HexOutput";
import type { HexSeparator } from "../../bindings/HexSeparator";

const RUST_COMMAND = "hex_process";
const TOOL_ID = "hex-converter";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function HexConverterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<HexMode>("textToHex");
  const [separator, setSeparator] = useState<HexSeparator>("space");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [byteCount, setByteCount] = useState(0);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      text: string,
      currentMode: HexMode,
      currentSeparator: HexSeparator
    ) => {
      if (text === "") {
        setOutput("");
        setError(null);
        setByteCount(0);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: HexInput = {
          text,
          mode: currentMode,
          separator: currentSeparator,
        };
        const result = (await callTool(RUST_COMMAND, payload, { skipHistory: true })) as HexOutput;
        setOutput(result.result ?? "");
        setError(result.error ?? null);
        setByteCount(result.byteCount ?? 0);
        if (!result.error) {
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
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : e != null
                  ? String(e)
                  : "Failed to run tool";
        setError(message);
        setOutput("");
        setByteCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(input, mode, separator);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, mode, separator, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleSwap = useCallback(() => {
    const newInput = output;
    const newMode = mode === "textToHex" ? "hexToText" : "textToHex";
    setInput(newInput);
    setDraft(newInput);
    setOutput(input);
    setMode(newMode);
    runProcess(newInput, newMode, separator);
  }, [input, output, mode, separator, runProcess, setDraft]);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput("");
    setError(null);
    setByteCount(0);
  }, [setDraft]);

  const lines = input.split("\n").length;
  const charCount = input.length;

  const isDragging = useRef(false);
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftPanelPercent(Math.min(90, Math.max(10, pct)));
    };
    const up = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const headerLabel =
    byteCount > 0 ? `${byteCount} ${byteCount === 1 ? "byte" : "bytes"}` : "Output";

  const separatorDisabled = mode === "hexToText";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0">
        {/* Input panel */}
        <div
          className="flex flex-col border-r border-border-light dark:border-border-dark shrink-0"
          style={{ width: `${leftPanelPercent}%` }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>Lines: {lines}</span>
            <span>Chars: {charCount}</span>
          </div>
          <textarea
            aria-label="Hex converter input text"
            className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder={
              mode === "textToHex"
                ? "Enter text to convert to hex…"
                : "Enter hex bytes to convert to text…"
            }
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              setInput(v);
              setDraft(v);
            }}
            spellCheck={false}
          />
        </div>

        {/* Draggable divider */}
        <button
          type="button"
          aria-label="Resize panels"
          className="w-1 shrink-0 bg-border-light dark:bg-border-dark hover:bg-primary/50 transition-colors cursor-col-resize"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Output panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>{headerLabel}</span>
            {isLoading && <span className="text-primary">Processing…</span>}
          </div>
          <pre
            aria-live="polite"
            aria-label="Hex converter output"
            className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
              error ? "text-red-400" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {error ? error : output || (isLoading ? "…" : "")}
          </pre>
        </div>
      </div>

      <ToolbarFooter
        groups={[
          {
            label: "Mode",
            children: (
              <>
                <PillButton
                  active={mode === "textToHex"}
                  onClick={() => setMode("textToHex")}
                  aria-label="Text to Hex mode"
                >
                  Text → Hex
                </PillButton>
                <PillButton
                  active={mode === "hexToText"}
                  onClick={() => setMode("hexToText")}
                  aria-label="Hex to Text mode"
                >
                  Hex → Text
                </PillButton>
              </>
            ),
          },
          {
            label: "Separator",
            children: (
              <>
                {(
                  [
                    ["none", "No separator", "None"] as const,
                    ["space", "Space separator", "Space"] as const,
                    ["colon", "Colon separator", "Colon"] as const,
                    ["dash", "Dash separator", "Dash"] as const,
                  ] as const
                ).map(([id, aria, text]) => (
                  <PillButton
                    key={id}
                    active={separator === id}
                    onClick={() => setSeparator(id)}
                    disabled={separatorDisabled}
                    aria-label={aria}
                  >
                    {text}
                  </PillButton>
                ))}
              </>
            ),
          },
          {
            end: true,
            children: (
              <>
                <button
                  type="button"
                  aria-label="Swap input and output"
                  onClick={handleSwap}
                  className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Swap
                </button>
                <CopyButton
                  value={output || undefined}
                  label="Copy"
                  variant="primary"
                  className="py-1"
                  aria-label="Copy output to clipboard"
                />
                <button
                  type="button"
                  aria-label="Clear input and output"
                  onClick={handleClear}
                  className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
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

export default HexConverterTool;

