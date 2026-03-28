/**
 * Syntax-highlighted code display using Prism.js.
 * Used by JSON, JWT, and code tools. Applies the app's dark theme.
 */

import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";
import { useEffect, useRef, useState } from "react";

const PRISM_STYLES = `
  /* ——— Light mode (default) ——— */
  .token.string        { color: #16a34a; }
  .token.number        { color: #b45309; }
  .token.boolean       { color: #7c3aed; }
  .token.null          { color: #64748b; }
  .token.property      { color: #2563eb; }
  .token.punctuation   { color: #94a3b8; }
  .token.operator      { color: #64748b; }
  .token.keyword       { color: #db2777; }
  .token.comment       { color: #94a3b8; font-style: italic; }
  .token.function      { color: #0891b2; }
  .token.class-name    { color: #b45309; }
  .token.tag           { color: #2563eb; }
  .token.attr-name     { color: #16a34a; }
  .token.attr-value    { color: #b45309; }

  /* ——— Dark mode ——— */
  .dark .token.string        { color: #86efac; }
  .dark .token.number        { color: #fcd34d; }
  .dark .token.boolean       { color: #c084fc; }
  .dark .token.null          { color: #94a3b8; }
  .dark .token.property      { color: #93c5fd; }
  .dark .token.punctuation   { color: #475569; }
  .dark .token.operator      { color: #94a3b8; }
  .dark .token.keyword       { color: #f472b6; }
  .dark .token.comment       { color: #475569; font-style: italic; }
  .dark .token.function      { color: #67e8f9; }
  .dark .token.class-name    { color: #fcd34d; }
  .dark .token.tag           { color: #93c5fd; }
  .dark .token.attr-name     { color: #86efac; }
  .dark .token.attr-value    { color: #fcd34d; }
`;

function injectPrismTheme() {
  if (typeof document === "undefined") return;
  if (!document.getElementById("prism-instrument-theme")) {
    const style = document.createElement("style");
    style.id = "prism-instrument-theme";
    style.textContent = PRISM_STYLES;
    document.head.appendChild(style);
  }
}

export interface CodeBlockProps {
  code: string;
  language:
    | "json"
    | "typescript"
    | "yaml"
    | "toml"
    | "sql"
    | "markup"
    | "bash"
    | "css"
    | "markdown";
  maxHeight?: string;
  showCopyButton?: boolean;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  maxHeight = "none",
  showCopyButton = true,
  showLineNumbers: _showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    injectPrismTheme();
  }, []);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!code) return null;

  return (
    <div
      className={`relative group rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden ${className ?? ""}`}
    >
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded px-2 py-1 text-xs"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}

      <div
        className={maxHeight === "100%" ? "flex-1 min-h-0 overflow-auto" : "overflow-auto"}
        style={maxHeight !== "100%" ? { maxHeight } : undefined}
      >
        <pre
          className={`language-${language} !m-0 !bg-transparent p-4 text-xs leading-relaxed font-mono`}
          style={{ tabSize: 2 }}
        >
          <code ref={codeRef} className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
