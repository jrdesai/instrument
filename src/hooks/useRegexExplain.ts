import { callTool } from "../bridge";
import { unwrapSpectaCommandResult } from "./unwrapSpectaCommandResult";

export type ExplainToken = {
  kind:
    | "literal"
    | "class"
    | "anchor"
    | "quantifier"
    | "group"
    | "group_end"
    | "alternation"
    | "meta";
  label: string;
  description: string;
  depth: number;
};

/** True if pattern ends with an unescaped backslash (invalid in regex). */
function hasTrailingUnescapedBackslash(pattern: string): boolean {
  let n = 0;
  for (let i = pattern.length - 1; i >= 0 && pattern[i] === "\\"; i--) n++;
  return n % 2 === 1;
}

export async function explainPattern(
  pattern: string,
  engine: string
): Promise<ExplainToken[]> {
  const trimmed = pattern.trim();
  if (!trimmed) return [];
  if (hasTrailingUnescapedBackslash(trimmed)) {
    throw new Error(
      "Pattern cannot end with a single backslash — escape it (\\\\) or add a character after it."
    );
  }
  const result = await callTool(
    "tool_regex_explain",
    { pattern: trimmed, engine },
    { skipHistory: true }
  );
  const tokens = unwrapSpectaCommandResult<ExplainToken[]>(result);
  return Array.isArray(tokens) ? tokens : [];
}
