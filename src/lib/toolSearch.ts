import type { Tool } from "../registry";

/** Relevance score for matching `query` against a tool (0 = no match signal). */
export function scoreMatch(tool: Tool, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const name = tool.name.toLowerCase();
  const desc = tool.description.toLowerCase();
  const cat = tool.displayCategory.toLowerCase();
  let score = 0;
  if (name === q) score += 10;
  else if (name.startsWith(q)) score += 8;
  else if (name.includes(q)) score += 6;
  if (tool.keywords.some((k) => k === q)) score += 5;
  else if (tool.keywords.some((k) => k.startsWith(q))) score += 3;
  else if (tool.keywords.some((k) => k.includes(q))) score += 1;
  if (desc.includes(q)) score += 2;
  if (cat.includes(q)) score += 1;
  return score;
}
