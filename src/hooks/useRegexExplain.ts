import { callTool, isDesktop } from "../bridge";
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
  if (isDesktop) {
    const result = await callTool(
      "tool_regex_explain",
      { pattern: trimmed, engine },
      { skipHistory: true }
    );
    const tokens = unwrapSpectaCommandResult<ExplainToken[]>(result);
    return Array.isArray(tokens) ? tokens : [];
  }

  const tokens = await new Promise<ExplainToken[]>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/regex.worker.ts", import.meta.url), {
      type: "module",
    });
    const id = crypto.randomUUID();

    worker.onmessage = (e: MessageEvent<{ id: string; success: boolean; result?: unknown; error?: string }>) => {
      if (e.data.id !== id) return;
      worker.terminate();
      if (e.data.success) {
        resolve(Array.isArray(e.data.result) ? (e.data.result as ExplainToken[]) : []);
      } else {
        reject(new Error(e.data.error ?? "Failed to explain regex"));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message ?? "Regex explain worker crashed"));
    };

    worker.postMessage({ id, explain: true, pattern: trimmed, engine });
  });

  return tokens;
}
