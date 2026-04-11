import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { twMerge } from "tailwind-merge";
import { marked } from "marked";
import hljs from "highlight.js";
import hljsGitHubLight from "highlight.js/styles/github.css?url";
import hljsGitHubDark from "highlight.js/styles/github-dark.css?url";
import { CopyButton } from "../../components/tool";
import { useFileDrop } from "../../hooks/useFileDrop";
import { usePreferenceStore } from "../../store";

const HLJS_LINK_ID = "instrument-markdown-hljs-theme";

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }) {
      const raw = lang?.trim() ?? "";
      const language = raw && hljs.getLanguage(raw) ? raw : "plaintext";
      const highlighted = hljs.highlight(text, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    },
  },
});

type ViewMode = "split" | "editor" | "preview";

function useEffectiveDark(): boolean {
  const theme = usePreferenceStore((s) => s.theme);
  const [dark, setDark] = useState(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (theme === "dark") {
      setDark(true);
      return;
    }
    if (theme === "light") {
      setDark(false);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return dark;
}

function useHljsStylesheet(isDark: boolean) {
  useEffect(() => {
    let link = document.getElementById(HLJS_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = HLJS_LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = isDark ? hljsGitHubDark : hljsGitHubLight;
    return () => {
      link?.remove();
    };
  }, [isDark]);
}

function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type ToolbarItem =
  | "divider"
  | { label: React.ReactNode; title: string; action: () => void };

function MarkdownEditorTool() {
  const isDark = useEffectiveDark();
  useHljsStylesheet(isDark);

  const [source, setSource] = useState("");
  const [html, setHtml] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [wordWrap, setWordWrap] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setHtml(marked.parse(source) as string);
      } catch {
        setHtml("<p class=\"text-red-500 text-sm\">Could not parse Markdown.</p>");
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [source]);

  const wordCount =
    source.trim() === "" ? 0 : source.trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleEditorScroll = useCallback(() => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;
    const denom = editor.scrollHeight - editor.clientHeight || 1;
    const ratio = editor.scrollTop / denom;
    preview.scrollTop =
      ratio * (preview.scrollHeight - preview.clientHeight || 1);
  }, []);

  const { isDragging, dropZoneProps } = useFileDrop({
    onFile: (text, filename) => {
      setFileDropError(null);
      setFileName(filename);
      setSource(text);
    },
    onError: (msg) => setFileDropError(msg),
  });

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileDropError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setSource(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const downloadMd = useCallback(() => {
    const blob = new Blob([source], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: fileName ?? "document.md",
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [source, fileName]);

  const downloadHtml = useCallback(() => {
    const titlePlain = fileName?.replace(/\.md$/i, "") ?? "document";
    const full = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtmlAttr(titlePlain)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}pre{background:#f6f8fa;padding:1rem;border-radius:6px;overflow:auto}code{font-family:monospace}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d0d7de;padding:.5rem .75rem}</style>
</head>
<body>${html}</body>
</html>`;
    const blob = new Blob([full], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `${titlePlain}.html`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [html, fileName]);

  const insertFormatting = useCallback(
    (before: string, after: string = before) => {
      const el = editorRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = source.slice(start, end);
      const replacement = selected
        ? `${before}${selected}${after}`
        : `${before}${after}`;
      const next = source.slice(0, start) + replacement + source.slice(end);
      setSource(next);
      requestAnimationFrame(() => {
        el.focus();
        const cursor = selected ? start + replacement.length : start + before.length;
        el.setSelectionRange(cursor, cursor);
      });
    },
    [source]
  );

  const insertLine = useCallback(
    (prefix: string) => {
      const el = editorRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const lineStart = source.lastIndexOf("\n", start - 1) + 1;
      const next = source.slice(0, lineStart) + prefix + source.slice(lineStart);
      setSource(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
      });
    },
    [source]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "b") {
        e.preventDefault();
        insertFormatting("**");
      }
      if (mod && e.key === "i") {
        e.preventDefault();
        insertFormatting("*");
      }
      if (mod && e.key === "k") {
        e.preventDefault();
        insertFormatting("[", "](url)");
      }
      if (e.key === "Tab") {
        e.preventDefault();
        insertFormatting("  ", "");
      }
    },
    [insertFormatting]
  );

  const toolbarButtons: ToolbarItem[] = useMemo(
    () => [
      { label: "B", title: "Bold", action: () => insertFormatting("**") },
      { label: "I", title: "Italic", action: () => insertFormatting("*") },
      { label: "~~", title: "Strikethrough", action: () => insertFormatting("~~") },
      "divider",
      { label: "H1", title: "Heading 1", action: () => insertLine("# ") },
      { label: "H2", title: "Heading 2", action: () => insertLine("## ") },
      { label: "H3", title: "Heading 3", action: () => insertLine("### ") },
      "divider",
      { label: "<>", title: "Inline code", action: () => insertFormatting("`") },
      {
        label: "```",
        title: "Code block",
        action: () => insertFormatting("```\n", "\n```"),
      },
      "divider",
      { label: "❝", title: "Blockquote", action: () => insertLine("> ") },
      {
        label: "—",
        title: "Horizontal rule",
        action: () => setSource((s) => `${s}\n\n---\n\n`),
      },
      "divider",
      {
        label: <span className="material-symbols-outlined text-[14px] leading-none">link</span>,
        title: "Link",
        action: () => insertFormatting("[", "](url)"),
      },
      {
        label: <span className="material-symbols-outlined text-[14px] leading-none">image</span>,
        title: "Image",
        action: () => insertFormatting("![", "](url)"),
      },
      "divider",
      { label: "•", title: "Unordered list", action: () => insertLine("- ") },
      { label: "1.", title: "Ordered list", action: () => insertLine("1. ") },
      { label: "☑", title: "Task list", action: () => insertLine("- [ ] ") },
      "divider",
      {
        label: "⊞",
        title: "Insert table",
        action: () => {
          const table =
            "\n| Header | Header | Header |\n|--------|--------|--------|\n| Cell   | Cell   | Cell   |\n| Cell   | Cell   | Cell   |\n";
          setSource((s) => s + table);
        },
      },
    ],
    [insertFormatting, insertLine]
  );

  const showEditor = viewMode === "split" || viewMode === "editor";
  const showPreview = viewMode === "split" || viewMode === "preview";

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
        {(["split", "editor", "preview"] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setViewMode(m)}
            className={twMerge(
              "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              viewMode === m
                ? "bg-primary/10 text-primary"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {m === "split" ? "Split" : m === "editor" ? "Editor" : "Preview"}
          </button>
        ))}

        <div className="mx-2 h-4 w-px bg-border-light dark:bg-border-dark" />

        <button
          type="button"
          onClick={() => setWordWrap((w) => !w)}
          className={twMerge(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            wordWrap
              ? "bg-primary/10 text-primary"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          Wrap
        </button>

        <div className="flex-1" />

        <label className="cursor-pointer rounded-lg border border-border-light bg-background-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-background-dark dark:text-slate-400 dark:hover:text-slate-200">
          Upload .md
          <input
            type="file"
            className="sr-only"
            accept=".md,.markdown,text/markdown"
            onChange={handleFileUpload}
          />
        </label>

        <button
          type="button"
          onClick={downloadMd}
          disabled={!source}
          className="rounded-lg border border-border-light bg-background-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-40 dark:border-border-dark dark:bg-background-dark dark:text-slate-400 dark:hover:text-slate-200"
        >
          Download .md
        </button>

        <button
          type="button"
          onClick={downloadHtml}
          disabled={!source}
          className="rounded-lg border border-border-light bg-background-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-40 dark:border-border-dark dark:bg-background-dark dark:text-slate-400 dark:hover:text-slate-200"
        >
          Download .html
        </button>
      </div>

      {viewMode !== "preview" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-border-light bg-panel-light px-3 py-1.5 dark:border-border-dark dark:bg-panel-dark">
          {toolbarButtons.map((item, i) =>
            item === "divider" ? (
              <div
                key={`d-${i}`}
                className="mx-1.5 h-4 w-px bg-border-light dark:bg-border-dark"
              />
            ) : (
              <button
                key={item.title}
                type="button"
                title={item.title}
                onClick={item.action}
                className="rounded px-2 py-1 font-mono text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                {item.label}
              </button>
            )
          )}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showEditor ? (
          <div
            className={twMerge(
              "relative flex min-h-0 min-w-0 flex-col border-border-light dark:border-border-dark",
              showPreview ? "md:w-1/2 md:border-r" : "flex-1"
            )}
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
                <span className="text-sm font-medium text-primary/70">Drop file to load</span>
              </div>
            )}
            {fileDropError ? (
              <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {fileDropError}
              </p>
            ) : null}
            <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {fileName ?? "Markdown"}
              </span>
              {wordCount > 0 ? (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {wordCount.toLocaleString()}{" "}
                  {wordCount === 1 ? "word" : "words"} · {readingTime} min read
                </span>
              ) : null}
            </div>
            <textarea
              ref={editorRef}
              value={source}
              onChange={(e) => {
                setFileDropError(null);
                setSource(e.target.value);
              }}
              onScroll={viewMode === "split" ? handleEditorScroll : undefined}
              onKeyDown={handleKeyDown}
              placeholder="Start writing Markdown…"
              spellCheck={false}
              className={twMerge(
                "custom-scrollbar min-h-0 w-full flex-1 resize-none bg-background-light p-4 font-mono text-sm text-slate-800 focus:outline-none dark:bg-background-dark dark:text-slate-200",
                wordWrap ? "whitespace-pre-wrap" : "overflow-x-auto whitespace-pre"
              )}
            />
          </div>
        ) : null}

        {showPreview ? (
          <div
            className={twMerge(
              "flex min-h-0 min-w-0 flex-col",
              showEditor ? "md:w-1/2" : "flex-1"
            )}
          >
            <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Preview
              </span>
              <CopyButton
                value={html || undefined}
                label="Copy HTML"
                variant="outline"
                className="py-1 text-xs"
              />
            </div>
            <div
              ref={previewRef}
              className="markdown-editor-preview prose prose-slate max-w-none h-full overflow-auto p-4 dark:prose-invert custom-scrollbar"
              dangerouslySetInnerHTML={{
                __html:
                  html ||
                  '<p class="text-slate-400 text-sm">Preview will appear here…</p>',
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MarkdownEditorTool;
