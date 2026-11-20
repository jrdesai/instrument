/**
 * Shared Prism.js configuration and theme injection.
 * Used by CodeBlock and MarkdownEditorTool so only one syntax highlighter is bundled.
 */

import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-python";

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

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  html: "markup",
  xml: "markup",
  svg: "markup",
  md: "markdown",
  rs: "rust",
  py: "python",
};

/** Injects the Instrument Prism light/dark token stylesheet once per document. */
export function injectPrismTheme(): void {
  if (typeof document === "undefined") return;
  if (!document.getElementById("prism-instrument-theme")) {
    const style = document.createElement("style");
    style.id = "prism-instrument-theme";
    style.textContent = PRISM_STYLES;
    document.head.appendChild(style);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Highlights a code snippet using Prism.js, falling back to HTML-escaped plaintext
 * for unknown languages.
 */
export function highlightCode(
  code: string,
  lang?: string
): { language: string; html: string } {
  const normalized = lang?.trim().toLowerCase() ?? "";
  const resolved = LANGUAGE_ALIASES[normalized] ?? normalized;
  const grammar = resolved ? Prism.languages[resolved] : undefined;
  if (grammar) {
    return {
      language: resolved,
      html: Prism.highlight(code, grammar, resolved),
    };
  }
  return {
    language: "plaintext",
    html: escapeHtml(code),
  };
}

export { Prism };
