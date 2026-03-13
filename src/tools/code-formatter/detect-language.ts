import type { CodeLanguage } from "./prettier-format";

/**
 * Simple heuristic detection of code language. User can always override.
 * Checks in order: Markdown → HTML → CSS → TypeScript → JavaScript (fallback).
 */
export function detectLanguage(code: string): CodeLanguage {
  const s = code.trim();
  if (!s) return "javascript";

  // 1. Markdown
  if (s.startsWith("#")) return "markdown";
  if (s.includes("##")) return "markdown";
  if (s.includes("```")) return "markdown";
  if (s.includes("- [ ]") || s.includes("- [x]")) return "markdown";

  // 2. HTML
  if (s.includes("<!DOCTYPE") || s.includes("<html")) return "html";
  if (s.includes("<head") || s.includes("<body")) return "html";
  if (s.includes("<div") || s.includes("<p>") || s.includes("<script")) return "html";

  // 3. CSS
  if (s.includes("{") && (s.includes("color:") || s.includes("margin:") || s.includes("padding:") || s.includes("font-") || s.includes("background:") || s.includes("display:") || s.includes("@media"))) {
    return "css";
  }

  // 4. TypeScript
  if (s.includes(": string") || s.includes(": number") || s.includes(": boolean")) return "typescript";
  if (s.includes("interface ") || s.includes("type ")) return "typescript";
  if (s.includes(" as ") && / as [A-Z]/.test(s)) return "typescript";

  // 5. JavaScript fallback
  return "javascript";
}
