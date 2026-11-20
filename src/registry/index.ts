import { CHAIN_TOOL_META } from "./chainMetadata";
import type { Role, Tool, ToolCategory } from "./types";
import { encodingTools } from "./categories/encoding";
import { codeTools } from "./categories/code";
import { cryptoTools } from "./categories/crypto";
import { authTools } from "./categories/auth";
import { jsonTools } from "./categories/json";
import { dataTools } from "./categories/data";
import { mediaTools } from "./categories/media";
import { networkTools } from "./categories/network";
import { textTools } from "./categories/text";
import { datetimeTools } from "./categories/datetime";
import { numbersTools } from "./categories/numbers";
import { designTools } from "./categories/design";

export type {
  ChainConfigField,
  Platform,
  Role,
  Tool,
  ToolCategory,
} from "./types";

/**
 * All registered tools, assembled from category modules.
 * Components are lazy-loaded; CHAIN_TOOL_META is merged below.
 */
export const tools: Tool[] = [
  ...encodingTools,
  ...codeTools,
  ...cryptoTools,
  ...authTools,
  ...jsonTools,
  ...dataTools,
  ...mediaTools,
  ...networkTools,
  ...textTools,
  ...datetimeTools,
  ...numbersTools,
  ...designTools,
];

for (let i = 0; i < tools.length; i++) {
  const patch = CHAIN_TOOL_META[tools[i].id];
  if (patch) {
    Object.assign(tools[i], patch);
  }
}

// Build lookup maps once at module init for O(1) access.
const _toolById = new Map<string, Tool>(tools.map((t) => [t.id, t]));
const _toolByRustCommand = new Map<string, Tool>(
  tools
    .filter((t) => t.rustCommand !== undefined)
    .map((t) => [t.rustCommand as string, t])
);

/**
 * Returns the tool with the given id, or undefined if not found.
 * @param id - Tool id (e.g. "base64-encoder")
 */
export function getToolById(id: string): Tool | undefined {
  return _toolById.get(id);
}

/** Returns all tools eligible for the tray popover (desktop mini-window). */
export function getPopoverTools(): Tool[] {
  return tools.filter((t) => t.trayPopover === true && t.implemented);
}

/**
 * Returns the tool whose rustCommand matches the given command string.
 * Used by the bridge to resolve a Rust command name back to a registry tool ID.
 * @param cmd - Rust command name (e.g. "word_counter_process")
 */
export function getToolByRustCommand(cmd: string): Tool | undefined {
  return _toolByRustCommand.get(cmd);
}

/**
 * Returns all tools in the given category.
 * @param cat - Tool category (e.g. "encoding", "json")
 */
export function getToolsByCategory(cat: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === cat);
}

/**
 * Returns all tools that include the given role.
 * @param role - Role tag (e.g. "frontend", "backend")
 */
export function getToolsByRole(role: Role): Tool[] {
  return tools.filter((t) => t.roles.includes(role));
}

/** Returns all unique display categories derived from the tool registry. */
export function getDisplayCategories(): {
  name: string;
  icon: string;
  toolCount: number;
}[] {
  const map = new Map<string, { icon: string; toolCount: number }>();
  for (const tool of tools) {
    if (!tool.implemented) continue;
    const existing = map.get(tool.displayCategory);
    if (existing) {
      existing.toolCount += 1;
    } else {
      map.set(tool.displayCategory, {
        icon: tool.displayCategoryIcon,
        toolCount: 1,
      });
    }
  }
  return Array.from(map.entries()).map(([name, data]) => ({
    name,
    ...data,
  }));
}

/** Returns all implemented tools in the given display category. */
export function getToolsByDisplayCategory(displayCategory: string): Tool[] {
  return tools.filter(
    (t) => t.displayCategory === displayCategory && t.implemented
  );
}

/**
 * Returns a map of role → display category names that contain
 * at least one implemented tool with that role.
 * Replaces the hardcoded sidebarMapping in library.ts.
 */
export function getRoleCategoryMapping(): Record<string, string[]> {
  const result: Record<string, string[]> = { All: [] };
  const allCategories = new Set<string>();

  for (const tool of tools) {
    if (!tool.implemented) continue;
    allCategories.add(tool.displayCategory);
    for (const role of tool.roles) {
      const key = role.charAt(0).toUpperCase() + role.slice(1);
      if (!result[key]) result[key] = [];
      if (!result[key].includes(tool.displayCategory)) {
        result[key].push(tool.displayCategory);
      }
    }
  }

  result["All"] = Array.from(allCategories);
  return result;
}
