import type { Tool } from "./index";

/**
 * Chain execution / UI metadata merged onto registry tools at startup.
 * Only tools that remain `chainable: true` with a `rustCommand` are listed.
 */
export const CHAIN_TOOL_META: Record<string, Partial<Tool>> = {
  "base64-encoder": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "encode", label: "Encode" },
          { value: "decode", label: "Decode" },
        ],
        default: "encode",
      },
      {
        key: "urlSafe",
        label: "URL-safe",
        type: "select",
        options: [
          { value: "false", label: "Standard" },
          { value: "true", label: "URL-safe" },
        ],
        default: "false",
      },
    ],
  },
  "url-encoder": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "encode", label: "Encode" },
          { value: "decode", label: "Decode" },
        ],
        default: "encode",
      },
      {
        key: "encodeType",
        label: "Encode type",
        type: "select",
        options: [
          { value: "full", label: "Full URL" },
          { value: "component", label: "Component" },
        ],
        default: "component",
      },
    ],
  },
  "html-entity": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "encode", label: "Encode" },
          { value: "decode", label: "Decode" },
        ],
        default: "encode",
      },
      {
        key: "encodeType",
        label: "Entity style",
        type: "select",
        options: [
          { value: "named", label: "Named" },
          { value: "numeric", label: "Numeric" },
        ],
        default: "named",
      },
    ],
  },
  "hex-converter": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "textToHex", label: "Text → hex" },
          { value: "hexToText", label: "Hex → text" },
        ],
        default: "textToHex",
      },
      {
        key: "separator",
        label: "Separator",
        type: "select",
        options: [
          { value: "none", label: "None" },
          { value: "space", label: "Space" },
          { value: "colon", label: "Colon" },
          { value: "dash", label: "Dash" },
        ],
        default: "space",
      },
    ],
  },
  "color-converter": {
    chainPrimaryInput: "value",
    chainOutputFields: [
      { key: "hex", label: "HEX" },
      { key: "rgb", label: "RGB" },
      { key: "hsl", label: "HSL" },
      { key: "hsb", label: "HSB" },
    ],
  },
  hash: {
    chainPrimaryInput: "text",
    chainOutputFields: [
      { key: "MD5", label: "MD5" },
      { key: "SHA-1", label: "SHA-1" },
      { key: "SHA-256", label: "SHA-256" },
      { key: "SHA-512", label: "SHA-512" },
      { key: "SHA3-256", label: "SHA3-256" },
      { key: "SHA3-512", label: "SHA3-512" },
    ],
    chainConfig: [
      {
        key: "outputFormat",
        label: "Output format",
        type: "select",
        options: [
          { value: "hex", label: "Hex" },
          { value: "base64", label: "Base64" },
          { value: "base64url", label: "Base64url" },
        ],
        default: "hex",
      },
    ],
  },
  "cert-decoder": { chainPrimaryInput: "pem" },
  jwt: {
    chainPrimaryInput: "token",
    chainOutputFields: [
      { key: "headerRaw", label: "Header JSON" },
      { key: "payloadRaw", label: "Payload JSON" },
      { key: "allClaims", label: "All claims JSON" },
      { key: "signatureRaw", label: "Signature (hex)" },
    ],
  },
  bcrypt: {
    chainPrimaryInput: "password",
    chainOutputFields: [
      { key: "hash", label: "Hash" },
      { key: "matches", label: "Matches (verify)" },
    ],
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "hash", label: "Hash" },
          { value: "verify", label: "Verify" },
        ],
        default: "hash",
      },
      {
        key: "cost",
        label: "Cost (hash)",
        type: "select",
        options: ["10", "11", "12", "13", "14", "15"].map((n) => ({ value: n, label: n })),
        default: "12",
      },
      { key: "hash", label: "Hash (verify)", type: "text", placeholder: "bcrypt hash", default: "" },
    ],
  },
  "aes-encrypt-decrypt": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "encrypt", label: "Encrypt" },
          { value: "decrypt", label: "Decrypt" },
        ],
        default: "encrypt",
      },
      { key: "passphrase", label: "Passphrase", type: "text", placeholder: "Secret", default: "" },
    ],
  },
  "json-formatter": {
    chainPrimaryInput: "value",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "pretty", label: "Pretty" },
          { value: "minify", label: "Minify" },
          { value: "compact", label: "Compact" },
        ],
        default: "pretty",
      },
      {
        key: "indent",
        label: "Indent",
        type: "select",
        options: [
          { value: "spaces2", label: "2 spaces" },
          { value: "spaces4", label: "4 spaces" },
          { value: "tab", label: "Tab" },
        ],
        default: "spaces2",
      },
    ],
  },
  "json-validator": { chainPrimaryInput: "value", chainPrimaryOutput: "formatted" },
  "json-schema-validator": {
    chainPrimaryInput: "document",
    chainPrimaryOutput: "annotatedDocument",
    chainConfig: [{ key: "schema", label: "JSON Schema", type: "text", placeholder: "{}", default: "{}" }],
  },
  "json-path": {
    chainPrimaryInput: "value",
    chainPrimaryOutput: "matches.0.value",
    chainConfig: [{ key: "query", label: "JSONPath", type: "text", placeholder: "$.key", default: "" }],
  },
  "json-converter": {
    chainPrimaryInput: "value",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "target",
        label: "Target",
        type: "select",
        options: [
          { value: "yaml", label: "YAML" },
          { value: "typeScript", label: "TypeScript" },
          { value: "csv", label: "CSV" },
          { value: "xml", label: "XML" },
        ],
        default: "yaml",
      },
    ],
  },
  "config-converter": {
    chainPrimaryInput: "value",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "from",
        label: "From",
        type: "select",
        options: [
          { value: "Json", label: "JSON" },
          { value: "Yaml", label: "YAML" },
          { value: "Toml", label: "TOML" },
        ],
        default: "Json",
      },
      {
        key: "to",
        label: "To",
        type: "select",
        options: [
          { value: "Json", label: "JSON" },
          { value: "Yaml", label: "YAML" },
          { value: "Toml", label: "TOML" },
        ],
        default: "Yaml",
      },
    ],
  },
  "csv-to-json": {
    chainPrimaryInput: "value",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "hasHeaders",
        label: "Header row",
        type: "select",
        options: [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
        default: "true",
      },
      { key: "delimiter", label: "Delimiter", type: "text", placeholder: ",", default: "," },
      {
        key: "outputFormat",
        label: "Layout",
        type: "select",
        options: [
          { value: "arrayOfObjects", label: "Array of objects" },
          { value: "arrayOfArrays", label: "Array of arrays" },
        ],
        default: "arrayOfObjects",
      },
    ],
  },
  "xml-formatter": { chainPrimaryInput: "value", chainPrimaryOutput: "result" },
  "html-formatter": { chainPrimaryInput: "code", chainPrimaryOutput: "formatted" },
  "yaml-formatter": { chainPrimaryInput: "value", chainPrimaryOutput: "result" },
  "url-parser": {
    chainPrimaryInput: "value",
    chainOutputFields: [
      { key: "scheme", label: "Scheme" },
      { key: "host", label: "Host" },
      { key: "path", label: "Path" },
      { key: "query", label: "Query" },
      { key: "fragment", label: "Fragment" },
      { key: "origin", label: "Origin" },
      { key: "username", label: "Username" },
      { key: "password", label: "Password" },
      { key: "port", label: "Port" },
    ],
  },
  "user-agent-parser": { chainPrimaryInput: "ua", chainPrimaryOutput: "result" },
  "env-parser": { chainPrimaryInput: "content", chainPrimaryOutput: "asJson" },
  "line-tools": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "operation",
        label: "Operation",
        type: "select",
        options: [
          { value: "trimWhitespace", label: "Trim whitespace" },
          { value: "deduplicate", label: "Deduplicate lines" },
          { value: "sortAsc", label: "Sort A→Z" },
          { value: "sortDesc", label: "Sort Z→A" },
          { value: "reverse", label: "Reverse lines" },
          { value: "removeEmpty", label: "Remove empty lines" },
        ],
        default: "trimWhitespace",
      },
    ],
  },
  "text-case-converter": {
    chainPrimaryInput: "text",
    chainOutputFields: [
      { key: "camelCase", label: "camelCase" },
      { key: "pascalCase", label: "PascalCase" },
      { key: "snakeCase", label: "snake_case" },
      { key: "screamingCase", label: "SCREAMING_SNAKE" },
      { key: "kebabCase", label: "kebab-case" },
      { key: "titleCase", label: "Title Case" },
      { key: "upperCase", label: "UPPER" },
      { key: "lowerCase", label: "lower" },
      { key: "dotCase", label: "dot.case" },
      { key: "pathCase", label: "path/case" },
    ],
  },
  "word-counter": {
    chainPrimaryInput: "text",
    chainOutputFields: [
      { key: "words", label: "Words" },
      { key: "charactersWithSpaces", label: "Chars (with spaces)" },
      { key: "charactersWithoutSpaces", label: "Chars (no spaces)" },
      { key: "lines", label: "Lines" },
      { key: "sentences", label: "Sentences" },
      { key: "paragraphs", label: "Paragraphs" },
    ],
  },
  "unicode-inspector": { chainPrimaryInput: "text", chainPrimaryOutput: "totalChars" },
  "slug-generator": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "slug",
    chainConfig: [
      {
        key: "separator",
        label: "Separator",
        type: "select",
        options: [
          { value: "-", label: "Hyphen (-)" },
          { value: "_", label: "Underscore (_)" },
        ],
        default: "-",
      },
    ],
  },
  "nato-phonetic": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "encode", label: "Encode" },
          { value: "decode", label: "Decode" },
        ],
        default: "encode",
      },
    ],
  },
  "string-escaper": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "escape", label: "Escape" },
          { value: "unescape", label: "Unescape" },
        ],
        default: "escape",
      },
      {
        key: "target",
        label: "Target",
        type: "select",
        options: [
          { value: "json", label: "JSON" },
          { value: "html", label: "HTML" },
          { value: "sql", label: "SQL" },
          { value: "regex", label: "Regex" },
          { value: "shell", label: "Shell" },
          { value: "csv", label: "CSV" },
        ],
        default: "json",
      },
    ],
  },
  "find-replace": {
    chainPrimaryInput: "text",
    chainPrimaryOutput: "result",
    chainConfig: [
      { key: "find", label: "Find", type: "text", default: "" },
      { key: "replace", label: "Replace", type: "text", default: "" },
      {
        key: "caseSensitive",
        label: "Case sensitive",
        type: "select",
        options: [
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
        default: "false",
      },
      {
        key: "regexMode",
        label: "Regex",
        type: "select",
        options: [
          { value: "false", label: "Plain text" },
          { value: "true", label: "Regex" },
        ],
        default: "false",
      },
      {
        key: "replaceAll",
        label: "Replace all",
        type: "select",
        options: [
          { value: "true", label: "Yes" },
          { value: "false", label: "First only" },
        ],
        default: "true",
      },
      {
        key: "wholeWord",
        label: "Whole word",
        type: "select",
        options: [
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
        default: "false",
      },
    ],
  },
  "timestamp-converter": {
    chainPrimaryInput: "value",
    chainOutputFields: [
      { key: "iso8601", label: "ISO 8601" },
      { key: "utcHuman", label: "UTC human" },
      { key: "unixSeconds", label: "Unix seconds" },
      { key: "relative", label: "Relative" },
    ],
    chainConfig: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "toHuman", label: "Unix → human" },
          { value: "toUnix", label: "Date → Unix" },
          { value: "now", label: "Now" },
        ],
        default: "toHuman",
      },
      {
        key: "unit",
        label: "Unit (toHuman)",
        type: "select",
        options: [
          { value: "seconds", label: "Seconds" },
          { value: "milliseconds", label: "Milliseconds" },
        ],
        default: "seconds",
      },
    ],
  },
  "timezone-converter": {
    chainPrimaryInput: "datetime",
    chainPrimaryOutput: "result",
    chainConfig: [
      { key: "fromTz", label: "From TZ", type: "text", placeholder: "America/New_York", default: "UTC" },
      { key: "toTz", label: "To TZ", type: "text", placeholder: "Europe/London", default: "UTC" },
    ],
  },
  "iso8601-formatter": { chainPrimaryInput: "value", chainPrimaryOutput: "asUtc" },
  "cron-parser": { chainPrimaryInput: "expression", chainPrimaryOutput: "description" },
  "number-base-converter": {
    chainPrimaryInput: "value",
    chainOutputFields: [
      { key: "decimal", label: "Decimal" },
      { key: "hexadecimal", label: "Hexadecimal" },
      { key: "binary", label: "Binary" },
      { key: "octal", label: "Octal" },
      { key: "base32", label: "Base32" },
      { key: "base36", label: "Base36" },
    ],
    chainConfig: [
      {
        key: "fromBase",
        label: "From base",
        type: "select",
        options: [
          { value: "decimal", label: "Decimal" },
          { value: "hexadecimal", label: "Hex" },
          { value: "binary", label: "Binary" },
          { value: "octal", label: "Octal" },
          { value: "base32", label: "Base32" },
          { value: "base36", label: "Base36" },
        ],
        default: "decimal",
      },
    ],
  },
  semver: {
    chainPrimaryInput: "version",
    chainPrimaryOutput: "canonical",
    chainConfig: [
      { key: "compareWith", label: "Compare with", type: "text", default: "" },
      { key: "range", label: "Range", type: "text", placeholder: "^1.0.0", default: "" },
    ],
  },
  "chmod-calculator": { chainPrimaryInput: "value", chainPrimaryOutput: "symbolic" },
  "expression-evaluator": { chainPrimaryInput: "expression", chainPrimaryOutput: "result" },
  "sql-formatter": {
    chainPrimaryInput: "value",
    chainPrimaryOutput: "result",
    chainConfig: [
      {
        key: "keywordCase",
        label: "Keywords",
        type: "select",
        options: [
          { value: "upper", label: "UPPER" },
          { value: "lower", label: "lower" },
          { value: "preserve", label: "Preserve" },
        ],
        default: "upper",
      },
    ],
  },
  "regex-tester": {
    chainPrimaryInput: "text",
    chainConfig: [
      { key: "pattern", label: "Pattern", type: "text", placeholder: "regex", default: ".*" },
      {
        key: "engine",
        label: "Engine",
        type: "select",
        options: [
          { value: "javascript", label: "JavaScript" },
          { value: "rust", label: "Rust" },
          { value: "go", label: "Go" },
          { value: "java", label: "Java" },
          { value: "python", label: "Python" },
          { value: "pcre", label: "PCRE" },
        ],
        default: "javascript",
      },
      { key: "flags", label: "Flags", type: "text", placeholder: "gi", default: "" },
    ],
  },
};
