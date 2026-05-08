import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CopyButton, PillButton, ToolbarFooter } from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { SlugInput } from "../../bindings/SlugInput";
import type { SlugOutput } from "../../bindings/SlugOutput";

const TOOL_ID = "slug-generator";
const RUST_COMMAND = "tool_slug_generate";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;


export default function SlugGeneratorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [separator, setSeparator] = useState<string>("-");
  const [lowercase, setLowercase] = useState(true);
  const [maxLengthRaw, setMaxLengthRaw] = useState("");
  const [output, setOutput] = useState<SlugOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runSlug = useCallback(
    async (
      text: string,
      sep: string,
      lower: boolean,
      maxLen: number | null
    ) => {
      if (text.trim() === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: SlugInput = {
          text,
          separator: sep,
          lowercase: lower,
          maxLength: maxLen,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as SlugOutput;
        setOutput(result);
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
          e instanceof Error ? e.message : e != null ? String(e) : "Slug failed";
        setOutput({ slug: "", error: message });
      }
    },
    [addHistoryEntry]
  );

  const maxLengthParsed: number | null =
    maxLengthRaw.trim() === ""
      ? null
      : Number.parseInt(maxLengthRaw, 10);
  const maxLength =
    maxLengthParsed != null &&
    !Number.isNaN(maxLengthParsed) &&
    maxLengthParsed > 0
      ? maxLengthParsed
      : null;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSlug(input, separator, lowercase, maxLength);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, separator, lowercase, maxLength, runSlug]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const slugText =
    output && !output.error && output.slug ? output.slug : undefined;

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col border-b border-border-light dark:border-border-dark md:border-b-0 md:border-r">
          <div className="flex min-h-[41px] items-center border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              INPUT
            </span>
          </div>
          <textarea
            className="min-h-[180px] w-full flex-1 resize-none border-none bg-transparent p-4 font-mono text-xs leading-relaxed placeholder:text-slate-500 focus:outline-none md:min-h-0"
            value={input}
            placeholder="Type or paste text to slugify…"
            spellCheck={false}
            onChange={(e) => {
              setInput(e.target.value);
              setDraft(e.target.value);
            }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[41px] items-center justify-between border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              SLUG
            </span>
            <CopyButton
              value={slugText}
              label="Copy"
              variant="primary"
              className="py-1.5 text-[11px] font-semibold uppercase tracking-wider"
            />
          </div>
          <div className="custom-scrollbar flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
            {slugText ? (
              <div className="w-full break-all font-mono text-sm text-slate-800 dark:text-slate-100">
                {slugText}
              </div>
            ) : output?.error ? (
              <div className="text-center text-sm text-red-600 dark:text-red-400">{output.error}</div>
            ) : (
              <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                Slug will appear here
              </div>
            )}
          </div>
        </div>
      </div>
      <ToolbarFooter
        groups={[
          {
            label: "Separator",
            children: (
              <>
                {(["-", "_", "."] as const).map((s) => (
                  <PillButton size="sm" key={s} active={separator === s} onClick={() => setSeparator(s)}>
                    {s}
                  </PillButton>
                ))}
              </>
            ),
          },
          {
            label: "Case",
            children: (
              <>
                <PillButton size="sm" active={lowercase} onClick={() => setLowercase(true)}>
                  lowercase
                </PillButton>
                <PillButton size="sm" active={!lowercase} onClick={() => setLowercase(false)}>
                  preserve
                </PillButton>
              </>
            ),
          },
          {
            end: true,
            label: "Max length",
            children: (
              <input
                type="text"
                inputMode="numeric"
                placeholder="No limit"
                value={maxLengthRaw}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setMaxLengthRaw(v);
                }}
                className="w-24 rounded-md border border-border-light bg-background-light px-2 py-1 font-mono text-xs text-slate-600 dark:border-border-dark dark:bg-background-dark dark:text-slate-400"
                aria-label="Max slug length"
              />
            ),
          },
        ]}
      />
    </div>
  );
}
