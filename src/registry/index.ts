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
  roles: Role[];
  icon: string;
  shortcut?: string;
  platforms: Platform[];
  rustCommand: string;
  keywords: string[];
  component: React.LazyExoticComponent<React.ComponentType<unknown>>;
  implemented: boolean;
}

/** Placeholder lazy component until real tool components exist. Replace with lazy( () => import('../tools/...') ) when adding the tool UI. */
const placeholderComponent = React.lazy(
  () =>
    Promise.resolve({
      default: () =>
        React.createElement(
          "div",
          { className: "p-4 text-slate-500" },
          "Tool not implemented yet."
        ),
    }) as Promise<{ default: React.ComponentType<unknown> }>
);

/**
 * All registered tools (v1.0). Components are lazy-loaded; paths are placeholders until tools exist.
 */
export const tools: Tool[] = [
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode text or binary using Base64.",
    category: "encoding",
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
    id: "url-encoder",
    name: "URL Encoder",
    description: "Encode or decode URL-safe percent-encoding.",
    category: "encoding",
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
    id: "md5-hash",
    name: "MD5 Hash",
    description: "Compute MD5 checksums.",
    category: "crypto",
    roles: ["backend", "security", "general"],
    icon: "fingerprint",
    platforms: ["desktop", "web"],
    rustCommand: "md5_process",
    keywords: ["md5", "hash", "checksum"],
    component: React.lazy(() =>
      import("../tools/md5-hash").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "sha256-hash",
    name: "SHA-256 Hash",
    description: "Compute SHA-256 hashes.",
    category: "crypto",
    roles: ["backend", "security", "general"],
    icon: "fingerprint",
    platforms: ["desktop", "web"],
    rustCommand: "tool_sha256_hash",
    keywords: ["sha256", "sha", "hash"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "sha512-hash",
    name: "SHA-512 Hash",
    description: "Compute SHA-512 hashes.",
    category: "crypto",
    roles: ["backend", "security", "general"],
    icon: "fingerprint",
    platforms: ["desktop", "web"],
    rustCommand: "tool_sha512_hash",
    keywords: ["sha512", "sha", "hash"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate UUIDs (v4, v7).",
    category: "crypto",
    roles: ["backend", "general"],
    icon: "tag",
    platforms: ["desktop", "web"],
    rustCommand: "tool_uuid_generate",
    keywords: ["uuid", "guid", "generate"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "ulid-generator",
    name: "ULID Generator",
    description: "Generate ULIDs.",
    category: "crypto",
    roles: ["backend", "data", "general"],
    icon: "tag",
    platforms: ["desktop", "web"],
    rustCommand: "tool_ulid_generate",
    keywords: ["ulid", "generate", "id"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode and inspect JWT payloads.",
    category: "auth",
    roles: ["backend", "security", "general"],
    icon: "token",
    platforms: ["desktop", "web"],
    rustCommand: "tool_jwt_decode",
    keywords: ["jwt", "decode", "token", "auth"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "jwt-builder",
    name: "JWT Builder",
    description: "Build and sign JWTs.",
    category: "auth",
    roles: ["backend", "security"],
    icon: "token",
    platforms: ["desktop", "web"],
    rustCommand: "tool_jwt_build",
    keywords: ["jwt", "build", "sign", "token"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "jwt-expiry-checker",
    name: "JWT Expiry Checker",
    description: "Check JWT expiration and claims.",
    category: "auth",
    roles: ["backend", "security"],
    icon: "schedule",
    platforms: ["desktop", "web"],
    rustCommand: "tool_jwt_expiry_check",
    keywords: ["jwt", "expiry", "exp", "token"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "api-key-generator",
    name: "API Key Generator",
    description: "Generate secure API keys.",
    category: "crypto",
    roles: ["backend", "security"],
    icon: "key",
    platforms: ["desktop", "web"],
    rustCommand: "tool_api_key_generate",
    keywords: ["api", "key", "generate", "secret"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format and minify JSON.",
    category: "json",
    roles: ["frontend", "backend", "data", "general"],
    icon: "data_object",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_format",
    keywords: ["json", "format", "prettify", "minify"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "json-validator",
    name: "JSON Validator",
    description: "Validate JSON and report errors.",
    category: "json",
    roles: ["frontend", "backend", "data", "general"],
    icon: "check_circle",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_validate",
    keywords: ["json", "validate", "schema"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "json-diff",
    name: "JSON Diff",
    description: "Diff two JSON values.",
    category: "json",
    roles: ["backend", "data", "general"],
    icon: "difference",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_diff",
    keywords: ["json", "diff", "compare"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "json-path",
    name: "JSON Path",
    description: "Query JSON with path expressions.",
    category: "json",
    roles: ["backend", "data"],
    icon: "route",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_path",
    keywords: ["json", "path", "query", "jq"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "json-to-typescript",
    name: "JSON to TypeScript",
    description: "Generate TypeScript types from JSON.",
    category: "json",
    roles: ["frontend", "backend", "general"],
    icon: "code",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_to_ts",
    keywords: ["json", "typescript", "types", "generate"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "yaml-to-json",
    name: "YAML to JSON",
    description: "Convert YAML to JSON.",
    category: "json",
    roles: ["backend", "data", "general"],
    icon: "code",
    platforms: ["desktop", "web"],
    rustCommand: "tool_yaml_to_json",
    keywords: ["yaml", "json", "convert"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "csv-to-json",
    name: "CSV to JSON",
    description: "Convert CSV to JSON.",
    category: "data",
    roles: ["backend", "data", "general"],
    icon: "table_chart",
    platforms: ["desktop", "web"],
    rustCommand: "tool_csv_to_json",
    keywords: ["csv", "json", "convert", "table"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "url-parser",
    name: "URL Parser",
    description: "Parse and inspect URLs.",
    category: "network",
    roles: ["frontend", "backend", "general"],
    icon: "link",
    platforms: ["desktop", "web"],
    rustCommand: "tool_url_parse",
    keywords: ["url", "parse", "query", "host"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "text-case-converter",
    name: "Text Case Converter",
    description: "Convert between lower, upper, camel, snake, etc.",
    category: "text",
    roles: ["frontend", "backend", "general"],
    icon: "text_fields",
    platforms: ["desktop", "web"],
    rustCommand: "tool_text_case",
    keywords: ["text", "case", "camel", "snake", "lower", "upper"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "word-counter",
    name: "Word Counter",
    description: "Count words, characters, and lines.",
    category: "text",
    roles: ["frontend", "general"],
    icon: "sort_by_alpha",
    platforms: ["desktop", "web"],
    rustCommand: "tool_word_count",
    keywords: ["word", "count", "character", "line"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "string-escaper",
    name: "String Escaper",
    description: "Escape and unescape strings (JSON, CSV, etc.).",
    category: "text",
    roles: ["frontend", "backend", "general"],
    icon: "keyboard",
    platforms: ["desktop", "web"],
    rustCommand: "tool_string_escape",
    keywords: ["string", "escape", "unescape", "json"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "find-replace",
    name: "Find & Replace",
    description: "Find and replace text with optional regex.",
    category: "text",
    roles: ["frontend", "backend", "general"],
    icon: "find_replace",
    platforms: ["desktop", "web"],
    rustCommand: "tool_find_replace",
    keywords: ["find", "replace", "regex", "search"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert Unix timestamps and human-readable dates.",
    category: "datetime",
    roles: ["backend", "data", "general"],
    icon: "schedule",
    platforms: ["desktop", "web"],
    rustCommand: "tool_timestamp_convert",
    keywords: ["timestamp", "unix", "date", "time"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "timezone-converter",
    name: "Timezone Converter",
    description: "Convert times between timezones.",
    category: "datetime",
    roles: ["backend", "general"],
    icon: "public",
    platforms: ["desktop", "web"],
    rustCommand: "tool_timezone_convert",
    keywords: ["timezone", "tz", "convert", "utc"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "iso8601-formatter",
    name: "ISO 8601 Formatter",
    description: "Format and parse ISO 8601 dates.",
    category: "datetime",
    roles: ["backend", "data", "general"],
    icon: "event",
    platforms: ["desktop", "web"],
    rustCommand: "tool_iso8601_format",
    keywords: ["iso8601", "iso", "date", "format"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "number-base-converter",
    name: "Number Base Converter",
    description: "Convert between decimal, hex, binary, octal.",
    category: "numbers",
    roles: ["frontend", "backend", "general"],
    icon: "numbers",
    platforms: ["desktop", "web"],
    rustCommand: "tool_number_base",
    keywords: ["number", "base", "hex", "binary", "decimal"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "bitwise-calculator",
    name: "Bitwise Calculator",
    description: "AND, OR, XOR, NOT, shift operations.",
    category: "numbers",
    roles: ["backend", "general"],
    icon: "memory",
    platforms: ["desktop", "web"],
    rustCommand: "tool_bitwise",
    keywords: ["bitwise", "and", "or", "xor", "shift"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "expression-evaluator",
    name: "Expression Evaluator",
    description: "Safely evaluate numeric or logical expressions.",
    category: "numbers",
    roles: ["backend", "general"],
    icon: "calculate",
    platforms: ["desktop", "web"],
    rustCommand: "tool_expression_eval",
    keywords: ["expression", "eval", "calculator"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "code-formatter",
    name: "Code Formatter",
    description: "Format code (JSON, HTML, etc.).",
    category: "code",
    roles: ["frontend", "backend", "general"],
    icon: "format_indent_increase",
    platforms: ["desktop", "web"],
    rustCommand: "tool_code_format",
    keywords: ["code", "format", "prettify"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Test regular expressions with live matches.",
    category: "code",
    roles: ["frontend", "backend", "general"],
    icon: "regular_expression",
    platforms: ["desktop", "web"],
    rustCommand: "tool_regex_test",
    keywords: ["regex", "regular expression", "test", "match"],
    component: placeholderComponent,
    implemented: false,
  },
  {
    id: "sql-formatter",
    name: "SQL Formatter",
    description: "Format and beautify SQL.",
    category: "code",
    roles: ["backend", "data", "general"],
    icon: "storage",
    platforms: ["desktop", "web"],
    rustCommand: "tool_sql_format",
    keywords: ["sql", "format", "beautify", "query"],
    component: placeholderComponent,
    implemented: false,
  },
];

/**
 * Returns the tool with the given id, or undefined if not found.
 * @param id - Tool id (e.g. "base64-encoder")
 */
export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
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
