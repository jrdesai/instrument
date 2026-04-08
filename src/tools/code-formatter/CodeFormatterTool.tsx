import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { CopyButton } from "../../components/tool";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import type { CodeLanguage } from "./prettier-format";
import { formatCode } from "./prettier-format";
import { detectLanguage } from "./detect-language";

const TOOL_ID = "code-formatter";
const DEBOUNCE_MS = 300;

type TabWidthOption = 2 | 4 | "tab";

const LANGUAGES: { id: CodeLanguage; label: string }[] = [
  { id: "javascript", label: "JS / TS" },
  { id: "typescript", label: "TypeScript" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "markdown", label: "Markdown" },
];

const EXT_TO_LANG: Record<string, CodeLanguage> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  html: "html",
  css: "css",
  md: "markdown",
  mdx: "markdown",
};

function codeLanguageToPrism(
  lang: CodeLanguage
): "json" | "typescript" | "yaml" | "sql" | "markup" | "bash" | "css" | "markdown" {
  switch (lang) {
    case "javascript":
    case "typescript":
      return "typescript";
    case "html":
      return "markup";
    case "css":
      return "css";
    case "markdown":
      return "markdown";
    default:
      return "typescript";
  }
}

function CodeFormatterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [language, setLanguage] = useState<CodeLanguage>("javascript");
  const [tabWidth, setTabWidth] = useState<TabWidthOption>(2);
  const [output, setOutput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [userOverrodeLang, setUserOverrodeLang] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const languageRef = useRef(language);
  const tabWidthRef = useRef(tabWidth);
  const isInitialMount = useRef(true);
  languageRef.current = language;
  tabWidthRef.current = tabWidth;

  const runFormat = useCallback(
    async (value: string, lang: CodeLanguage, width: TabWidthOption) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput("");
        setError(null);
        return;
      }
      setIsFormatting(true);
      setError(null);
      const { result, error: err } = await formatCode(value, lang, width);
      setIsFormatting(false);
      setOutput(result);
      setError(err);
    },
    []
  );

  // Debounced format on input change (callback uses refs for latest language/tabWidth)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = input.trim();
    if (trimmed === "") {
      setOutput("");
      setError(null);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = setTimeout(() => {
      runFormat(input, languageRef.current, tabWidthRef.current);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, runFormat]);

  // Auto-detect language on input change when user has not overridden
  useEffect(() => {
    if (userOverrodeLang || !input.trim()) return;
    const detected = detectLanguage(input);
    setLanguage(detected);
  }, [input, userOverrodeLang]);

  // Re-format immediately when language or tabWidth changes (input non-empty); skip on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (input.trim() === "") return;
    runFormat(input, language, tabWidth);
  }, [language, tabWidth, runFormat]);

  const handleDownload = useCallback((content: string, downloadName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      setFileName(file.name);
      const detected = EXT_TO_LANG[ext];
      if (detected) {
        setLanguage(detected);
        setUserOverrodeLang(true);
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setInput(text);
        setDraft(text);
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setDraft]
  );

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput("");
    setError(null);
    setFileName(null);
    setUserOverrodeLang(false);
  }, [setDraft]);

  const handleFormatNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    runFormat(input, language, tabWidth);
  }, [input, language, tabWidth, runFormat]);

  const handleLanguageChange = useCallback((lang: CodeLanguage) => {
    setLanguage(lang);
    setUserOverrodeLang(true);
  }, []);

  const isEmpty = input.trim() === "";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[41px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {fileName ?? "Input"}
              </span>
              {fileName ? (
                <button
                  type="button"
                  onClick={() => {
                    setFileName(null);
                    setInput("");
                    setDraft("");
                    setUserOverrodeLang(false);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              ) : null}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-0.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  accept=".js,.jsx,.ts,.tsx,.html,.css,.md,.mdx"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {!isEmpty && (
              <span className="text-slate-600 text-xs tabular-nums">
                {input.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="Code input"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste code here..."
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              setInput(v);
              setDraft(v);
            }}
          />
        </div>

        {/* Right panel — output */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[41px]">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              OUTPUT
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {isFormatting ? "Formatting..." : output ? `${output.split("\n").length} lines` : ""}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-background-light dark:bg-background-dark">
            {output ? (
              <CodeBlock
                language={codeLanguageToPrism(language)}
                code={output}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 px-4">
                {isEmpty
                  ? "Enter code on the left to see formatted output here."
                  : "Formatting..."}
              </div>
            )}
          </div>
          {error && (
            <div className="px-4 py-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer — options + actions */}
      <footer className="shrink-0 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 text-xs text-slate-500 dark:text-slate-400">
          {/* Language group */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider">
              Language
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {LANGUAGES.map(({ id, label }) => (
                <label key={id} className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="code-lang"
                    className="h-3 w-3 accent-primary"
                    checked={language === id}
                    onChange={() => handleLanguageChange(id)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

          {/* Tab width group */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider">
              Tab width
            </span>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="code-tab"
                  className="h-3 w-3 accent-primary"
                  checked={tabWidth === 2}
                  onChange={() => setTabWidth(2)}
                />
                <span>2 Spaces</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="code-tab"
                  className="h-3 w-3 accent-primary"
                  checked={tabWidth === 4}
                  onChange={() => setTabWidth(4)}
                />
                <span>4 Spaces</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="code-tab"
                  className="h-3 w-3 accent-primary"
                  checked={tabWidth === "tab"}
                  onChange={() => setTabWidth("tab")}
                />
                <span>Tab</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={handleFormatNow}
              disabled={isEmpty}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Format
            </button>
            {output && !error ? (
              <button
                type="button"
                onClick={() =>
                  handleDownload(output, fileName ?? "formatted-code.txt", "text/plain")
                }
                className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
              >
                Download
              </button>
            ) : null}
            <CopyButton
              value={output && !error ? output : undefined}
              label="Copy"
              variant="primary"
              className="py-1.5 text-[11px] font-semibold uppercase tracking-wider"
            />
            <button
              type="button"
              onClick={handleClear}
              disabled={isEmpty && !output}
              className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CodeFormatterTool;
