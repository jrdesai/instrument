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
import "prismjs/components/prism-bash";
import { useEffect, useRef, useState } from "react";

const PRISM_STYLES = `
  .token.string        { color: #86efac; }
  .token.number        { color: #fcd34d; }
  .token.boolean       { color: #c084fc; }
  .token.null          { color: #94a3b8; }
  .token.property      { color: #93c5fd; }
  .token.punctuation   { color: #475569; }
  .token.operator      { color: #94a3b8; }
  .token.keyword       { color: #f472b6; }
  .token.comment       { color: #475569; font-style: italic; }
  .token.function      { color: #67e8f9; }
  .token.class-name    { color: #fcd34d; }
  .token.tag           { color: #93c5fd; }
  .token.attr-name     { color: #86efac; }
  .token.attr-value    { color: #fcd34d; }
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
  language: "json" | "typescript" | "yaml" | "sql" | "markup" | "bash";
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
      className={`relative group rounded-lg border border-border-dark bg-background-dark overflow-hidden ${className ?? ""}`}
    >
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 bg-background-dark border border-border-dark rounded px-2 py-1 text-xs"
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
