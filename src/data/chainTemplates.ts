export type ChainTag = "backend" | "frontend" | "security" | "data" | "devops";

export interface ChainTemplate {
  id: string;
  name: string;
  description: string;
  tags: ChainTag[];
  steps: {
    toolId: string;
    outputField?: string;
    config: Record<string, unknown>;
  }[];
}

export const CHAIN_TEMPLATES: ChainTemplate[] = [
  {
    id: "jwt-payload",
    name: "JWT → Payload",
    description: "Decode a JWT token and extract the payload as formatted JSON.",
    tags: ["security", "backend"],
    steps: [
      { toolId: "jwt", outputField: "payloadRaw", config: {} },
      { toolId: "json-formatter", config: { mode: "pretty", indent: "spaces2" } },
    ],
  },
  {
    id: "url-query-params",
    name: "URL → Query Params",
    description: "Parse a URL and extract the query string as formatted JSON.",
    tags: ["frontend", "backend"],
    steps: [
      { toolId: "url-parser", outputField: "query", config: {} },
      { toolId: "json-formatter", config: { mode: "pretty", indent: "spaces2" } },
    ],
  },
  {
    id: "csv-to-json",
    name: "CSV → JSON",
    description: "Convert CSV data to formatted JSON.",
    tags: ["data", "backend"],
    steps: [
      { toolId: "csv-to-json", config: { hasHeaders: "true", delimiter: "," } },
      { toolId: "json-formatter", config: { mode: "pretty", indent: "spaces2" } },
    ],
  },
  {
    id: "hash-to-base64",
    name: "Hash → Base64",
    description: "SHA-256 hash text then encode the digest as Base64.",
    tags: ["security", "backend"],
    steps: [
      { toolId: "hash", outputField: "SHA-256", config: { outputFormat: "hex" } },
      { toolId: "base64-encoder", config: { mode: "encode", urlSafe: "false" } },
    ],
  },
  {
    id: "env-to-json",
    name: "ENV → JSON",
    description: "Parse a .env file and view its contents as formatted JSON.",
    tags: ["devops", "backend"],
    steps: [
      { toolId: "env-parser", config: {} },
      { toolId: "json-formatter", config: { mode: "pretty", indent: "spaces2" } },
    ],
  },
  {
    id: "json-to-yaml",
    name: "JSON → YAML",
    description: "Convert JSON configuration to YAML format.",
    tags: ["devops", "backend"],
    steps: [
      { toolId: "config-converter", config: { from: "Json", to: "Yaml" } },
      { toolId: "yaml-formatter", config: {} },
    ],
  },
  {
    id: "text-url-slug",
    name: "Text → URL Slug",
    description: "Generate a URL slug from text and encode it for use in a URL.",
    tags: ["frontend"],
    steps: [
      { toolId: "slug-generator", config: { separator: "-" } },
      { toolId: "url-encoder", config: { mode: "encode", encodeType: "component" } },
    ],
  },
];

export const ALL_TAGS: ChainTag[] = ["backend", "frontend", "security", "data", "devops"];
