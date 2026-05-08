import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import {
  CopyButton,
  PillButton,
  ToolbarFooter,
  type FooterGroup,
} from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { Base32Variant } from "../../bindings/Base32Variant";
import type { BaseNEncoding } from "../../bindings/BaseNEncoding";
import type { BaseNInput } from "../../bindings/BaseNInput";
import type { BaseNMode } from "../../bindings/BaseNMode";
import type { BaseNOutput } from "../../bindings/BaseNOutput";

const TOOL_ID = "base32-base58";
const RUST_COMMAND = "tool_base32_base58_process";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

export default function Base32Base58Tool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const isEmpty = input.trim().length === 0;
  const [encoding, setEncoding] = useState<BaseNEncoding>("base32");
  const [mode, setMode] = useState<BaseNMode>("encode");
  const [base32Variant, setBase32Variant] =
    useState<Base32Variant>("standard");
  const [output, setOutput] = useState<BaseNOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      text: string,
      enc: BaseNEncoding,
      m: BaseNMode,
      variant: Base32Variant
    ) => {
      if (!text.trim()) {
        setOutput(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const payload: BaseNInput = {
          text,
          encoding: enc,
          mode: m,
          base32Variant: variant,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as BaseNOutput;
        setOutput(result);
        if (!result.error && result.result.length > 0) {
          if (historyDebounceRef.current) {
            clearTimeout(historyDebounceRef.current);
          }
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
        setOutput({
          result: "",
          error: e instanceof Error ? e.message : String(e ?? "Failed"),
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
      void runProcess(input, encoding, mode, base32Variant);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, encoding, mode, base32Variant, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) {
        clearTimeout(historyDebounceRef.current);
      }
    };
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput(null);
  }, [setDraft]);

  const err = output?.error ?? null;
  const resultText = output?.result ?? "";

  const encodingGroup: FooterGroup = {
    label: "Encoding",
    children: (
      <div className="flex flex-wrap gap-1">
        {(["base32", "base58"] as const).map((enc) => (
          <PillButton
            key={enc}
            active={encoding === enc}
            onClick={() => setEncoding(enc)}
            size="sm"
            shape="full"
          >
            {enc === "base32" ? "Base32" : "Base58"}
          </PillButton>
        ))}
      </div>
    ),
  };

  const modeGroup: FooterGroup = {
    label: "Mode",
    children: (
      <div className="flex flex-wrap gap-1">
        {(["encode", "decode"] as const).map((m) => (
          <PillButton
            key={m}
            active={mode === m}
            onClick={() => setMode(m)}
            size="sm"
            shape="full"
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </PillButton>
        ))}
      </div>
    ),
  };

  const variantGroup: FooterGroup | null =
    encoding === "base32"
      ? {
          label: "Variant",
          children: (
            <div className="flex flex-wrap gap-1">
              {(["standard", "crockford"] as const).map((v) => (
                <PillButton
                  key={v}
                  active={base32Variant === v}
                  onClick={() => setBase32Variant(v)}
                  size="sm"
                  shape="full"
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </PillButton>
              ))}
            </div>
          ),
        }
      : null;

  const actionsGroup: FooterGroup = {
    end: true,
    children: (
      <>
        <CopyButton
          value={resultText || undefined}
          label="Copy"
          variant="primary"
          className="py-1 text-sm"
        />
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="rounded-full px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-red-400"
        >
          Clear
        </button>
      </>
    ),
  };

  const footerGroups: FooterGroup[] = [
    encodingGroup,
    modeGroup,
    ...(variantGroup ? [variantGroup] : []),
    actionsGroup,
  ];

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-[180px] min-w-0 flex-1 flex-col border-b border-border-light dark:border-border-dark md:border-b-0 md:border-r">
          <div className="shrink-0 border-b border-border-light bg-panel-light px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-border-dark dark:bg-panel-dark dark:text-slate-500">
            Input
          </div>
          <textarea
            aria-label="Input text"
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-300"
            placeholder="Paste text to encode or a Base32/Base58 string to decode"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setDraft(e.target.value);
            }}
            spellCheck={false}
          />
        </div>
        <div className="flex min-h-[180px] min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Output
            </span>
            {isLoading ? (
              <span className="text-xs text-primary">Processing…</span>
            ) : null}
          </div>
          {err ? (
            <p className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-600 dark:text-red-400">
              {err}
            </p>
          ) : null}
          <textarea
            aria-label="Output text"
            readOnly
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 focus:outline-none dark:text-slate-300"
            value={resultText}
          />
        </div>
      </div>

      <ToolbarFooter groups={footerGroups} />
    </div>
  );
}
