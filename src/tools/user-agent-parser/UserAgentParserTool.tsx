import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { UaParseInput } from "../../bindings/UaParseInput";
import type { UaParseOutput } from "../../bindings/UaParseOutput";

const RUST_COMMAND = "ua_parse";
const TOOL_ID = "user-agent-parser";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const EXAMPLES = [
  {
    label: "Chrome",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  {
    label: "Firefox",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  },
  {
    label: "Safari iOS",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  {
    label: "Googlebot",
    ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
  {
    label: "curl",
    ua: "curl/7.88.1",
  },
  {
    label: "Edge",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  },
] as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed to parse User-Agent string";
}

function UserAgentParserTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState<UaParseOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (ua: string) => {
      const trimmed = ua.trim();
      if (!trimmed) {
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        setOutput(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const payload: UaParseInput = { ua: trimmed };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as UaParseOutput;
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
      } catch (error) {
        setOutput({
          browserName: null,
          browserVersion: null,
          os: null,
          osVersion: null,
          deviceType: "Unknown",
          engine: null,
          isBot: false,
          vendor: null,
          category: "",
          error: getErrorMessage(error),
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
      void runProcess(input);
      debounceRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleExampleClick = useCallback(
    (ua: string) => {
      setInput(ua);
      setDraft(ua);
    },
    [setDraft]
  );

  const handleClear = useCallback(() => {
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    setInput("");
    setDraft("");
    setOutput(null);
    setIsLoading(false);
  }, [setDraft]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="border-b border-border-light bg-panel-light px-6 py-4 dark:border-border-dark dark:bg-panel-dark">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Input
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Paste a User-Agent string to inspect browser, OS, device, and bot metadata.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-border-light bg-background-light px-3 py-1 text-sm text-slate-600 transition-colors hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-300"
          >
            Clear
          </button>
        </div>

        <textarea
          aria-label="User-Agent string"
          rows={4}
          value={input}
          onChange={(event) => {
            const value = event.target.value;
            setInput(value);
            setDraft(value);
          }}
          placeholder="Mozilla/5.0 ..."
          spellCheck={false}
          className="mt-4 w-full resize-none rounded-xl border border-border-light bg-background-light px-3 py-2.5 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-100 dark:placeholder-slate-600"
        />

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 dark:text-slate-500">Examples:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => handleExampleClick(example.ua)}
              className="rounded-full border border-border-light px-2.5 py-0.5 text-xs text-slate-500 transition-colors hover:border-primary/40 hover:text-primary dark:border-border-dark dark:text-slate-400"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 py-5">
        {!input.trim() ? (
          <EmptyState />
        ) : isLoading ? (
          <LoadingState />
        ) : output?.error ? (
          <ErrorState message={output.error} />
        ) : output ? (
          <ResultGrid output={output} />
        ) : null}
      </div>
    </div>
  );
}

function ResultGrid({ output }: { output: UaParseOutput }) {
  const cards = [
    {
      label: "Browser",
      icon: "language",
      primary: output.browserName ?? "Unknown",
      secondary: output.browserVersion ?? null,
    },
    {
      label: "Operating System",
      icon: "computer",
      primary: output.os ?? "Unknown",
      secondary: output.osVersion ?? null,
    },
    {
      label: "Device",
      icon: deviceIcon(output.deviceType),
      primary: output.deviceType,
      secondary: output.vendor ?? null,
      accent: deviceAccent(output.deviceType),
    },
    {
      label: "Engine",
      icon: "settings",
      primary: output.engine ?? "Unknown",
      secondary: null,
    },
    {
      label: "Category",
      icon: "category",
      primary: output.category || "Unknown",
      secondary: null,
    },
    {
      label: "Bot",
      icon: output.isBot ? "smart_toy" : "person",
      primary: output.isBot ? "Yes" : "No",
      secondary: null,
      accent: output.isBot
        ? "text-amber-600 dark:text-amber-400"
        : "text-green-600 dark:text-green-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col gap-1 rounded-xl border border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark"
        >
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-500">
              {card.icon}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {card.label}
            </span>
          </div>
          <span
            className={`text-base font-semibold ${card.accent ?? "text-slate-800 dark:text-slate-100"}`}
          >
            {card.primary}
          </span>
          {card.secondary ? (
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {card.secondary}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600">
        devices
      </span>
      <p className="text-sm text-slate-400 dark:text-slate-600">
        Paste a User-Agent string or pick an example above
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="text-sm text-slate-400 dark:text-slate-600">Parsing...</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
    </div>
  );
}

function deviceIcon(type: string): string {
  switch (type) {
    case "Mobile":
      return "smartphone";
    case "Tablet":
      return "tablet";
    case "Bot":
      return "smart_toy";
    case "Desktop":
      return "computer";
    default:
      return "devices";
  }
}

function deviceAccent(type: string): string {
  switch (type) {
    case "Mobile":
      return "text-blue-600 dark:text-blue-400";
    case "Tablet":
      return "text-purple-600 dark:text-purple-400";
    case "Bot":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-slate-800 dark:text-slate-100";
  }
}

export default UserAgentParserTool;
