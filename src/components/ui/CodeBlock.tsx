/**
 * Syntax-highlighted code display using Prism.js.
 * Used by JSON, JWT, and code tools. Applies the app's dark theme.
 */

import { useEffect, useRef, useState } from "react";
import { Prism, injectPrismTheme } from "../../lib/prism";

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
