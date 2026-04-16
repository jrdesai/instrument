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
import type { HtmlEntityEncodeType } from "../../bindings/HtmlEntityEncodeType";
import type { HtmlEntityInput } from "../../bindings/HtmlEntityInput";
import type { HtmlEntityMode } from "../../bindings/HtmlEntityMode";
import type { HtmlEntityOutput } from "../../bindings/HtmlEntityOutput";

const RUST_COMMAND = "tool_html_entity_process";
const TOOL_ID = "html-entity";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function HtmlEntityTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<HtmlEntityMode>("encode");
  const [encodeType, setEncodeType] = useState<HtmlEntityEncodeType>("named");
  const [entitiesFound, setEntitiesFound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      text: string,
      currentMode: HtmlEntityMode,
      currentEncodeType: HtmlEntityEncodeType
    ) => {
      if (text === "") {
        setOutput("");
        setError(null);
        setEntitiesFound(0);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: HtmlEntityInput = {
          text,
          mode: currentMode,
          encodeType: currentEncodeType,
        };
        const result = (await callTool(RUST_COMMAND, payload, { skipHistory: true })) as HtmlEntityOutput;
        setOutput(result.result ?? "");
        setError(result.error ?? null);
        setEntitiesFound(result.entitiesFound ?? 0);
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
        setEntitiesFound(0);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(input, mode, encodeType);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, mode, encodeType, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleSwap = useCallback(() => {
    const newInput = output;
    const newMode = mode === "encode" ? "decode" : "encode";
    setInput(newInput);
    setDraft(newInput);
    setOutput(input);
    setMode(newMode);
    runProcess(newInput, newMode, encodeType);
  }, [input, output, mode, encodeType, runProcess, setDraft]);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput("");
    setError(null);
    setEntitiesFound(0);
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

  const entitiesLabel =
    entitiesFound > 0
      ? mode === "encode"
        ? `${entitiesFound} ${entitiesFound === 1 ? "entity" : "entities"} encoded`
        : `${entitiesFound} ${entitiesFound === 1 ? "entity" : "entities"} decoded`
      : null;

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
            aria-label="HTML entity input text"
            className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder={
              mode === "encode"
                ? "Enter text to encode as HTML entities…"
                : "Enter HTML entities to decode…"
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
            <span>{entitiesLabel ?? "Output"}</span>
            {isLoading && <span className="text-primary">Processing…</span>}
          </div>
          <pre
            aria-live="polite"
            aria-label="HTML entity output"
            className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
              error ? "text-red-400" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {error ? error : output || (isLoading ? "…" : "")}
          </pre>
        </div>
      </div>

      <ToolbarFooter
        className="items-center py-2"
        groups={[
          {
            ariaLabel: "Encode or decode mode",
            children: (
              <>
                <PillButton
                  active={mode === "encode"}
                  onClick={() => setMode("encode")}
                  aria-label="Encode mode"
                >
                  Encode
                </PillButton>
                <PillButton
                  active={mode === "decode"}
                  onClick={() => setMode("decode")}
                  aria-label="Decode mode"
                >
                  Decode
                </PillButton>
              </>
            ),
          },
          {
            ariaLabel: "Encode type",
            children: (
              <>
                <PillButton
                  active={encodeType === "named"}
                  onClick={() => setEncodeType("named")}
                  aria-label="Named entities (e.g. &amp;, &lt;)"
                >
                  Named
                </PillButton>
                <PillButton
                  active={encodeType === "numeric"}
                  onClick={() => setEncodeType("numeric")}
                  aria-label="Numeric entities (e.g. &#38;, &#60;)"
                >
                  Numeric
                </PillButton>
              </>
            ),
          },
          {
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
          {
            end: true,
            children: (
              <CopyButton
                value={output || undefined}
                label="Copy"
                variant="primary"
                className="py-1"
                aria-label="Copy output to clipboard"
              />
            ),
          },
        ]}
      />
    </div>
  );
}

export default HtmlEntityTool;
