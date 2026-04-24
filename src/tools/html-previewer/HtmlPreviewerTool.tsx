import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";

type ViewMode = "split" | "code" | "preview";

const TOOL_ID = "html-previewer";
const DEBOUNCE_MS = 150;

export default function HtmlPreviewerTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [source, setSource] = useState("");
  useRestoreStringDraft(TOOL_ID, setSource);
  const [preview, setPreview] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [wordWrap, setWordWrap] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreview(source);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [source]);

  const { isDragging, dropZoneProps } = useFileDrop({
    onFile: (text, filename) => {
      setFileDropError(null);
      setFileName(filename);
      setSource(text);
      setDraft(text);
    },
    onError: (msg) => setFileDropError(msg),
    accept: ".html,.htm,text/html",
  });

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileDropError(null);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setSource(text);
          setDraft(text);
        }
      };
      reader.onerror = () =>
        setFileDropError("Failed to read file — it may be locked or unreadable.");
      reader.readAsText(file);
      e.target.value = "";
    },
    [setDraft]
  );

  const handleDownload = useCallback(() => {
    const blob = new Blob([source], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: fileName ?? "snippet.html",
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [source, fileName]);

  const handleClear = useCallback(() => {
    setSource("");
    setDraft("");
    setPreview("");
    setFileName(null);
    setFileDropError(null);
  }, [setDraft]);

  const isEmpty = source.trim() === "";
  const lineCount = source ? source.split("\n").length : 0;
  const charCount = source.length;

  const showCode = viewMode === "split" || viewMode === "code";
  const showPreview = viewMode === "split" || viewMode === "preview";

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
        {(["split", "code", "preview"] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setViewMode(m)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              viewMode === m
                ? "bg-primary/10 text-primary"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {m === "split" ? "Split" : m === "code" ? "Code" : "Preview"}
          </button>
        ))}

        <div className="mx-2 h-4 w-px bg-border-light dark:bg-border-dark" />

        <button
          type="button"
          onClick={() => setWordWrap((w) => !w)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            wordWrap
              ? "bg-primary/10 text-primary"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Wrap
        </button>

        <div className="flex-1" />

        <label className="cursor-pointer rounded-lg border border-border-light bg-background-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-background-dark dark:text-slate-400 dark:hover:text-slate-200">
          Upload .html
          <input
            type="file"
            className="sr-only"
            accept=".html,.htm,text/html"
            onChange={handleFileUpload}
          />
        </label>

        <button
          type="button"
          onClick={handleDownload}
          disabled={isEmpty}
          className="rounded-lg border border-border-light bg-background-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-40 dark:border-border-dark dark:bg-background-dark dark:text-slate-400 dark:hover:text-slate-200"
        >
          Download
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showCode && (
          <div
            className={`relative flex min-h-0 min-w-0 flex-col border-border-light dark:border-border-dark ${
              showPreview
                ? "min-h-[240px] border-b md:min-h-0 md:w-1/2 md:border-b-0 md:border-r"
                : "flex-1"
            }`}
            {...dropZoneProps}
          >
            {isDragging && (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
                aria-hidden
              >
                <span className="material-symbols-outlined text-[32px] text-primary/60">
                  upload_file
                </span>
                <span className="text-sm font-medium text-primary/70">Drop HTML file to load</span>
              </div>
            )}

            <div className="flex min-h-[41px] shrink-0 items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {fileName ?? "HTML"}
                </span>
                {fileName && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>
              {!isEmpty && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            <textarea
              aria-label="HTML source"
              className={`custom-scrollbar min-h-0 w-full flex-1 resize-none bg-background-light p-4 font-mono text-xs leading-relaxed text-slate-700 placeholder:text-slate-400 focus:outline-none dark:bg-background-dark dark:text-slate-300 dark:placeholder:text-slate-500 ${
                wordWrap ? "whitespace-pre-wrap" : "overflow-x-auto whitespace-pre"
              }`}
              placeholder="Paste HTML here, or drag and drop an .html file…"
              value={source}
              spellCheck={false}
              onChange={(e) => {
                setFileDropError(null);
                const v = e.target.value;
                setSource(v);
                setDraft(v);
              }}
            />
          </div>
        )}

        {showPreview && (
          <div
            className={`flex min-h-0 min-w-0 flex-col ${
              showCode ? "min-h-[240px] md:min-h-0 md:w-1/2" : "flex-1"
            }`}
          >
            <div className="flex min-h-[41px] shrink-0 items-center border-b border-border-light px-4 py-2 dark:border-border-dark">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Preview
              </span>
            </div>

            {isEmpty ? (
              <div className="flex h-full items-center justify-center p-4 text-sm text-slate-400 dark:text-slate-500">
                Enter HTML on the left to see the preview.
              </div>
            ) : (
              <iframe
                title="HTML Preview"
                sandbox="allow-scripts"
                srcDoc={preview}
                className="min-h-0 flex-1 border-none bg-white"
                aria-label="Sandboxed HTML preview"
              />
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-border-light bg-panel-light px-4 py-1.5 dark:border-border-dark dark:bg-panel-dark">
        {fileDropError ? (
          <span className="text-xs text-red-600 dark:text-red-400">{fileDropError}</span>
        ) : (
          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {isEmpty
              ? "Empty"
              : `${charCount.toLocaleString()} chars · ${lineCount.toLocaleString()} lines`}
          </span>
        )}
      </div>
    </div>
  );
}
