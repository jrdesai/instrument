import React from "react";

/** Category for Library filtering and grouping. */
export type ToolCategory =
  | "encoding"
  | "crypto"
  | "auth"
  | "json"
  | "text"
  | "datetime"
  | "numbers"
  | "code"
  | "network"
  | "design"
  | "data";

/** Role tag for tool discovery (e.g. frontend, backend). */
export type Role =
  | "frontend"
  | "backend"
  | "devops"
  | "security"
  | "data"
  | "general";

/** Platform(s) the tool runs on. */
export type Platform = "desktop" | "web";

/** Registry entry for a single tool. */
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  displayCategory: string;
  displayCategoryIcon: string;
  roles: Role[];
  icon: string;
  shortcut?: string;
  platforms: Platform[];
  rustCommand?: string;
  keywords: string[];
  component: React.LazyExoticComponent<React.ComponentType<unknown>>;
  implemented: boolean;
  /** If true, input/output are never recorded in history (e.g. JWT, API keys). */
  sensitive?: boolean;

  /**
   * Override for the WASM export name when it differs from rustCommand.
   * Example: rustCommand "tool_regex_explain" → wasmExport "regex_explain"
   * If omitted, rustCommand is used as-is for both desktop and web.
   */
  wasmExport?: string;

  /**
   * Override for the Tauri invoke payload key when it differs from "input".
   * Example: regex commands use "req" instead of "input".
   * Defaults to "input" if omitted.
   */
  desktopPayloadKey?: string;
}

/** Placeholder lazy component for future tools (currently unused). */

/**
 * All registered tools (v1.0). Components are lazy-loaded; paths are placeholders until tools exist.
 */
export const tools: Tool[] = [
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode text or binary using Base64.",
    category: "encoding",
    displayCategory: "Encoding",
    displayCategoryIcon: "data_array",
    roles: ["frontend", "backend", "general"],
    icon: "data_array",
    platforms: ["desktop", "web"],
    rustCommand: "base64_process",
    keywords: ["base64", "encode", "decode", "binary"],
    component: React.lazy(() =>
      import("../tools/base64").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Test regular expressions across engines without freezing the UI.",
    category: "code",
    displayCategory: "Code",
    displayCategoryIcon: "code",
    roles: ["frontend", "backend", "general"],
    icon: "find_in_page",
    platforms: ["desktop", "web"],
    rustCommand: "tool_regex_test",
    desktopPayloadKey: "req",
    keywords: ["regex", "regular expression", "match", "pattern"],
    component: React.lazy(
      () =>
        import("../tools/regex-tester") as Promise<{
          default: React.ComponentType<unknown>;
        }>
    ),
    implemented: true,
  },
  /** Same UI as Regex Tester; separate row so `tool_regex_explain` resolves for the bridge. Not shown in Library (implemented: false). */
  {
    id: "regex-explain",
    name: "Regex Explain",
    description: "Explain regex pattern structure (used from Regex Tester).",
    category: "code",
    displayCategory: "Code",
    displayCategoryIcon: "code",
    roles: ["frontend", "backend", "general"],
    icon: "find_in_page",
    platforms: ["desktop", "web"],
    rustCommand: "tool_regex_explain",
    wasmExport: "regex_explain",
    desktopPayloadKey: "req",
    keywords: ["regex", "explain", "pattern"],
    component: React.lazy(
      () =>
        import("../tools/regex-tester") as Promise<{
          default: React.ComponentType<unknown>;
        }>
    ),
    implemented: false,
  },
  {
    id: "url-encoder",
    name: "URL Encoder",
    description: "Encode or decode URL-safe percent-encoding.",
    category: "encoding",
    displayCategory: "Encoding",
    displayCategoryIcon: "data_array",
    roles: ["frontend", "backend", "general"],
    icon: "link",
    platforms: ["desktop", "web"],
    rustCommand: "url_encode_process",
    keywords: ["url", "encode", "decode", "percent"],
    component: React.lazy(() =>
      import("../tools/url-encoder").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "html-entity",
    name: "HTML Entity",
    description: "Encode or decode HTML entities.",
    category: "encoding",
    displayCategory: "Encoding",
    displayCategoryIcon: "data_array",
    roles: ["frontend", "general"],
    icon: "html",
    platforms: ["desktop", "web"],
    rustCommand: "html_entity_process",
    keywords: ["html", "entity", "encode", "decode"],
    component: React.lazy(() =>
      import("../tools/html-entity").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "hex-converter",
    name: "Hex Converter",
    description: "Convert between hex, bytes, and text.",
    category: "encoding",
    displayCategory: "Encoding",
    displayCategoryIcon: "data_array",
    roles: ["frontend", "backend", "general"],
    icon: "calculate",
    platforms: ["desktop", "web"],
    rustCommand: "hex_process",
    keywords: ["hex", "hexadecimal", "convert"],
    component: React.lazy(() =>
      import("../tools/hex-converter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "color-converter",
    name: "Color Converter",
    description: "Convert colors between HEX, RGB, HSL, HSB, and CSS names.",
    category: "encoding",
    displayCategory: "Encoding",
    displayCategoryIcon: "data_array",
    roles: ["frontend", "general"],
    icon: "palette",
    platforms: ["desktop", "web"],
    rustCommand: "color_convert",
    keywords: ["color", "colour", "hex", "rgb", "hsl", "hsb", "hsv", "css", "convert", "palette"],
    component: React.lazy(() =>
      import("../tools/color-converter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "hash",
    name: "Hash",
    description:
      "Hash text with MD5, SHA-1, SHA-256, SHA-512, SHA3-256, or SHA3-512. Supports Hex, Base64, and HMAC mode.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "security",
    roles: ["backend", "security", "general"],
    icon: "tag",
    platforms: ["desktop", "web"],
    rustCommand: "hash_process",
    sensitive: false,
    keywords: [
      "hash",
      "md5",
      "sha",
      "sha1",
      "sha256",
      "sha512",
      "sha3",
      "hmac",
      "checksum",
      "digest",
    ],
    component: React.lazy(() =>
      import("../tools/hash/HashTool").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate UUIDs (v4, v7).",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "verified_user",
    roles: ["backend", "general"],
    icon: "tag",
    platforms: ["desktop", "web"],
    rustCommand: "uuid_process",
    keywords: ["uuid", "guid", "generate"],
    component: React.lazy(() =>
      import("../tools/uuid-generator").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "ulid-generator",
    name: "ULID Generator",
    description: "Generate ULIDs.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "verified_user",
    roles: ["backend", "data", "general"],
    icon: "tag",
    platforms: ["desktop", "web"],
    rustCommand: "ulid_process",
    keywords: ["ulid", "generate", "id"],
    component: React.lazy(() =>
      import("../tools/ulid-generator").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "nano-id-generator",
    name: "Nano ID Generator",
    description:
      "Generate compact, URL-safe random IDs with configurable size and alphabet.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "verified_user",
    roles: ["backend", "general"],
    icon: "tag",
    platforms: ["desktop", "web"],
    rustCommand: "nanoid_process",
    keywords: ["nanoid", "nano", "id", "generate", "random"],
    component: React.lazy(() =>
      import("../tools/nano-id-generator").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "jwt",
    name: "JWT",
    description:
      "Decode and inspect JWT tokens, or build and sign new ones with HMAC.",
    category: "auth",
    displayCategory: "Auth",
    displayCategoryIcon: "token",
    roles: ["backend", "security", "general"],
    icon: "token",
    platforms: ["desktop", "web"],
    rustCommand: "tool_jwt_decode",
    keywords: [
      "jwt",
      "decode",
      "encode",
      "build",
      "sign",
      "token",
      "auth",
      "hmac",
      "bearer",
    ],
    component: React.lazy(() =>
      import("../tools/jwt/JwtTool").then((m) => ({ default: m.default }))
    ),
    implemented: true,
    sensitive: true,
  },
  {
    id: "api-key-generator",
    name: "API Key Generator",
    description: "Generate secure API keys.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "verified_user",
    roles: ["backend", "security"],
    icon: "key",
    platforms: ["desktop", "web"],
    rustCommand: "api_key_process",
    keywords: ["api", "key", "generate", "secret"],
    component: React.lazy(() =>
      import("../tools/api-key-generator").then((m) => ({ default: m.default }))
    ),
    implemented: true,
    sensitive: true,
  },
  {
    id: "aes-encrypt-decrypt",
    name: "AES Encrypt / Decrypt",
    description:
      "Encrypt and decrypt text using AES-256-GCM with a passphrase.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "security",
    roles: ["backend", "security", "general"],
    icon: "lock",
    platforms: ["desktop", "web"],
    rustCommand: "aes_process",
    sensitive: true,
    keywords: [
      "aes",
      "encrypt",
      "decrypt",
      "gcm",
      "symmetric",
      "cipher",
      "secret",
    ],
    component: React.lazy(() =>
      import("../tools/aes-encrypt-decrypt/AesEncryptDecryptTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format and minify JSON.",
    category: "json",
    displayCategory: "JSON Tools",
    displayCategoryIcon: "data_object",
    roles: ["frontend", "backend", "data", "general"],
    icon: "data_object",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_format",
    keywords: ["json", "format", "prettify", "minify"],
    component: React.lazy(() =>
      import("../tools/json-formatter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "json-validator",
    name: "JSON Validator",
    description: "Validate JSON and report errors.",
    category: "json",
    displayCategory: "JSON Tools",
    displayCategoryIcon: "data_object",
    roles: ["frontend", "backend", "data", "general"],
    icon: "check_circle",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_validate",
    keywords: ["json", "validate", "schema"],
    component: React.lazy(() =>
      import("../tools/json-validator").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "json-diff",
    name: "JSON Diff",
    description: "Diff two JSON values.",
    category: "json",
    displayCategory: "JSON Tools",
    displayCategoryIcon: "data_object",
    roles: ["backend", "data", "general"],
    icon: "difference",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_diff",
    keywords: ["json", "diff", "compare"],
    component: React.lazy(() =>
      import("../tools/json-diff").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "json-path",
    name: "JSON Path",
    description: "Query JSON with path expressions.",
    category: "json",
    displayCategory: "JSON Tools",
    displayCategoryIcon: "data_object",
    roles: ["backend", "data"],
    icon: "route",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_path",
    keywords: ["json", "path", "query", "jq"],
    component: React.lazy(() =>
      import("../tools/json-path").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "json-converter",
    name: "JSON Converter",
    description: "Convert JSON to YAML, TypeScript, CSV, or XML.",
    category: "json",
    displayCategory: "JSON Tools",
    displayCategoryIcon: "data_object",
    roles: ["frontend", "backend", "data", "general"],
    icon: "compare_arrows",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_convert",
    keywords: ["json", "yaml", "typescript", "csv", "xml", "convert", "transform"],
    component: React.lazy(() =>
      import("../tools/json-converter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "yaml-to-json",
    name: "YAML to JSON",
    description: "Convert YAML to JSON.",
    category: "json",
    displayCategory: "JSON Tools",
    displayCategoryIcon: "data_object",
    roles: ["backend", "data", "general"],
    icon: "code",
    platforms: ["desktop", "web"],
    rustCommand: "tool_yaml_to_json",
    keywords: ["yaml", "json", "convert"],
    component: React.lazy(
      () =>
        import("../tools/yaml-to-json") as Promise<{
          default: React.ComponentType<unknown>;
        }>
    ),
    implemented: true,
  },
  {
    id: "csv-to-json",
    name: "CSV to JSON",
    description: "Convert CSV to JSON.",
    category: "data",
    displayCategory: "Data",
    displayCategoryIcon: "table_chart",
    roles: ["backend", "data", "general"],
    icon: "table_chart",
    platforms: ["desktop", "web"],
    rustCommand: "tool_csv_to_json",
    keywords: ["csv", "json", "convert", "table"],
    component: React.lazy(() =>
      import("../tools/csv-to-json/CsvToJsonTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "url-parser",
    name: "URL Parser",
    description: "Parse and inspect URL components.",
    category: "network",
    displayCategory: "Network",
    displayCategoryIcon: "router",
    roles: ["frontend", "backend", "general"],
    icon: "link",
    platforms: ["desktop", "web"],
    rustCommand: "tool_url_parse",
    keywords: ["url", "parse", "query", "host", "path", "fragment"],
    component: React.lazy(() =>
      import("../tools/url-parser/UrlParserTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "text-case-converter",
    name: "Text Case Converter",
    description: "Convert between lower, upper, camel, snake, etc.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["frontend", "backend", "general"],
    icon: "text_fields",
    platforms: ["desktop", "web"],
    rustCommand: "case_process",
    keywords: ["text", "case", "camel", "snake", "lower", "upper"],
    component: React.lazy(() =>
      import("../tools/text-case-converter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "word-counter",
    name: "Word Counter",
    description: "Count words, characters, and lines.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["frontend", "general"],
    icon: "sort_by_alpha",
    platforms: ["desktop", "web"],
    rustCommand: "word_counter_process",
    keywords: ["word", "count", "character", "line"],
    component: React.lazy(() =>
      import("../tools/word-counter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "string-escaper",
    name: "String Escaper",
    description: "Escape and unescape strings (JSON, CSV, etc.).",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["frontend", "backend", "general"],
    icon: "keyboard",
    platforms: ["desktop", "web"],
    rustCommand: "string_escaper_process",
    keywords: ["string", "escape", "unescape", "json"],
    component: React.lazy(() =>
      import("../tools/string-escaper").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "find-replace",
    name: "Find & Replace",
    description: "Find and replace text with optional regex.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["frontend", "backend", "general"],
    icon: "find_replace",
    platforms: ["desktop", "web"],
    rustCommand: "find_replace_process",
    keywords: ["find", "replace", "regex", "search"],
    component: React.lazy(() =>
      import("../tools/find-replace").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "text-diff",
    name: "Text Diff",
    description: "Compare two blocks of text line by line.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["frontend", "backend", "general"],
    icon: "difference",
    platforms: ["desktop", "web"],
    rustCommand: "text_diff_process",
    keywords: ["text", "diff", "compare", "difference", "lines"],
    component: React.lazy(() =>
      import("../tools/text-diff").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "lorem-ipsum",
    name: "Lorem Ipsum Generator",
    description: "Generate placeholder text (paragraphs, sentences, or words).",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["frontend", "general"],
    icon: "format_quote",
    platforms: ["desktop", "web"],
    rustCommand: "lorem_ipsum_process",
    keywords: ["lorem", "ipsum", "placeholder", "dummy", "text"],
    component: React.lazy(() =>
      import("../tools/lorem-ipsum").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert Unix timestamps and human-readable dates.",
    category: "datetime",
    displayCategory: "Date & Time",
    displayCategoryIcon: "schedule",
    roles: ["backend", "data", "general"],
    icon: "schedule",
    platforms: ["desktop", "web"],
    rustCommand: "timestamp_process",
    keywords: ["timestamp", "unix", "date", "time"],
    component: React.lazy(() =>
      import("../tools/timestamp-converter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "timezone-converter",
    name: "Timezone Converter",
    description: "Convert times between timezones.",
    category: "datetime",
    displayCategory: "Date & Time",
    displayCategoryIcon: "schedule",
    roles: ["backend", "general"],
    icon: "public",
    platforms: ["desktop", "web"],
    rustCommand: "timezone_process",
    keywords: ["timezone", "tz", "convert", "utc"],
    component: React.lazy(() =>
      import("../tools/timezone-converter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "iso8601-formatter",
    name: "ISO 8601 Formatter",
    description: "Format and parse ISO 8601 dates.",
    category: "datetime",
    displayCategory: "Date & Time",
    displayCategoryIcon: "schedule",
    roles: ["backend", "data", "general"],
    icon: "event",
    platforms: ["desktop", "web"],
    rustCommand: "iso8601_process",
    keywords: ["iso8601", "iso", "date", "format"],
    component: React.lazy(() =>
      import("../tools/iso8601-formatter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "cron-parser",
    name: "Cron Expression Parser",
    description:
      "Parse and validate cron expressions. See next scheduled run times.",
    category: "datetime",
    displayCategory: "Date & Time",
    displayCategoryIcon: "schedule",
    roles: ["backend", "devops", "general"],
    icon: "update",
    platforms: ["desktop", "web"],
    rustCommand: "cron_process",
    keywords: ["cron", "schedule", "expression", "job", "interval", "timer"],
    component: React.lazy(() =>
      import("../tools/cron-parser/CronParserTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "number-base-converter",
    name: "Number Base Converter",
    description: "Convert between decimal, hex, binary, octal.",
    category: "numbers",
    displayCategory: "Numbers",
    displayCategoryIcon: "numbers",
    roles: ["frontend", "backend", "general"],
    icon: "numbers",
    platforms: ["desktop", "web"],
    rustCommand: "base_converter_process",
    keywords: ["number", "base", "hex", "binary", "decimal"],
    component: React.lazy(() =>
      import("../tools/number-base-converter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "bitwise-calculator",
    name: "Bitwise Calculator",
    description: "AND, OR, XOR, NOT, shift operations.",
    category: "numbers",
    displayCategory: "Numbers",
    displayCategoryIcon: "numbers",
    roles: ["backend", "general"],
    icon: "memory",
    platforms: ["desktop", "web"],
    rustCommand: "bitwise_process",
    keywords: ["bitwise", "and", "or", "xor", "shift"],
    component: React.lazy(() =>
      import("../tools/bitwise-calculator").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "expression-evaluator",
    name: "Expression Evaluator",
    description: "Safely evaluate numeric or logical expressions.",
    category: "numbers",
    displayCategory: "Numbers",
    displayCategoryIcon: "numbers",
    roles: ["backend", "general"],
    icon: "calculate",
    platforms: ["desktop", "web"],
    rustCommand: "tool_expression_eval",
    keywords: ["expression", "eval", "calculator"],
    component: React.lazy(() =>
      import("../tools/expression-evaluator").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "code-formatter",
    name: "Code Formatter",
    description: "Format JavaScript, TypeScript, HTML, CSS, and Markdown.",
    category: "code",
    displayCategory: "Code",
    displayCategoryIcon: "code",
    roles: ["frontend", "backend", "general"],
    icon: "format_indent_increase",
    platforms: ["desktop", "web"],
    keywords: [
      "code",
      "format",
      "prettier",
      "javascript",
      "typescript",
      "html",
      "css",
      "markdown",
    ],
    component: React.lazy(() =>
      import("../tools/code-formatter/CodeFormatterTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "sql-formatter",
    name: "SQL Formatter",
    description: "Format and beautify SQL.",
    category: "code",
    displayCategory: "Code",
    displayCategoryIcon: "code",
    roles: ["backend", "data", "general"],
    icon: "storage",
    platforms: ["desktop", "web"],
    rustCommand: "tool_sql_format",
    keywords: ["sql", "format", "beautify", "query"],
    component: React.lazy(() =>
      import("../tools/sql-formatter/SqlFormatterTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
];

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
