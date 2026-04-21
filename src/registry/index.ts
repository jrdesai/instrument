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
  | "data"
  | "media"
  | "design";

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
   * If true, this tool can be used in the tray popover mini-window (desktop).
   * Only for tools that work in a ~400×520px single-panel layout.
   */
  trayPopover?: boolean;
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
    rustCommand: "tool_base64_process",
    keywords: [
      "base64",
      "encode",
      "decode",
      "binary",
      "image",
      "file",
      "attachment",
      "data uri",
      "atob",
      "btoa",
      "encode string",
      "decode string",
    ],
    component: React.lazy(() =>
      import("../tools/base64").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    keywords: [
      "regex",
      "regular expression",
      "match",
      "pattern",
      "regexp",
      "pattern matching",
      "test regex",
      "capture group",
      "replace",
      "find pattern",
      "validate input",
    ],
    component: React.lazy(
      () =>
        import("../tools/regex-tester") as Promise<{
          default: React.ComponentType<unknown>;
        }>
    ),
    trayPopover: true,
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
    rustCommand: "tool_url_encode_process",
    keywords: [
      "url",
      "encode",
      "decode",
      "percent",
      "percent encoding",
      "uri",
      "escape",
      "unescape",
      "query string",
      "encode url",
      "decode url",
    ],
    component: React.lazy(() =>
      import("../tools/url-encoder").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    icon: "code",
    platforms: ["desktop", "web"],
    rustCommand: "tool_html_entity_process",
    keywords: [
      "html",
      "entity",
      "encode",
      "decode",
      "escape html",
      "unescape html",
      "ampersand",
      "special characters",
      "xss",
      "sanitize",
    ],
    component: React.lazy(() =>
      import("../tools/html-entity").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "morse-code",
    name: "Morse Code",
    description: "Encode text to Morse code dots and dashes, or decode Morse back to text.",
    category: "encoding",
    displayCategory: "Encoding",
    displayCategoryIcon: "code",
    roles: ["general"],
    icon: "radio",
    platforms: ["desktop", "web"],
    keywords: [
      "morse",
      "morse code",
      "dots",
      "dashes",
      "encode",
      "decode",
      "telegraph",
      "dit",
      "dah",
      "radio",
      "ham radio",
      "amateur radio",
      "sos",
      "signal",
    ],
    component: React.lazy(() =>
      import("../tools/morse-code").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_hex_process",
    keywords: [
      "hex",
      "hexadecimal",
      "convert",
      "bytes",
      "ascii",
      "text to hex",
      "hex to text",
      "binary",
      "encoding",
    ],
    component: React.lazy(() =>
      import("../tools/hex-converter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_color_convert",
    keywords: [
      "color",
      "colour",
      "hex",
      "rgb",
      "hsl",
      "hsb",
      "hsv",
      "css",
      "convert",
      "palette",
      "color picker",
      "colour picker",
      "color code",
      "oklch",
      "tailwind",
      "design",
      "rgba",
    ],
    component: React.lazy(() =>
      import("../tools/color-converter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "qr-code",
    name: "QR Code Generator",
    description: "Generate QR codes locally from any text, URL, or data.",
    category: "encoding",
    displayCategory: "Encoding",
    displayCategoryIcon: "data_array",
    roles: ["frontend", "backend", "general"],
    icon: "qr_code",
    platforms: ["desktop", "web"],
    rustCommand: "tool_qr_generate",
    keywords: [
      "qr",
      "qrcode",
      "barcode",
      "url",
      "encode",
      "scan",
      "qr generator",
      "link",
      "wifi",
      "contact",
      "share",
    ],
    component: React.lazy(() =>
      import("../tools/qr-code").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_hash_process",
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
      "fingerprint",
      "integrity",
      "verify file",
      "bcrypt",
      "pbkdf2",
      "hmac key",
    ],
    component: React.lazy(() =>
      import("../tools/hash/HashTool").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "cert-decoder",
    name: "Certificate Decoder",
    description:
      "Decode X.509 / PEM certificates - subject, SANs, validity, and key info.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "security",
    roles: ["devops", "security"],
    icon: "verified",
    platforms: ["desktop", "web"],
    rustCommand: "tool_cert_decode",
    sensitive: true,
    keywords: [
      "certificate",
      "x509",
      "pem",
      "tls",
      "ssl",
      "cert",
      "san",
      "certificate file",
      "pem file",
      ".pem",
      ".crt",
      ".cer",
      "ssl certificate",
      "tls certificate",
      "x509 decode",
      "inspect cert",
      "expiry",
      "expiration",
    ],
    component: React.lazy(() =>
      import("../tools/cert-decoder").then((m) => ({ default: m.default }))
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
    rustCommand: "tool_uuid_process",
    keywords: ["uuid", "guid", "generate", "unique id", "v4", "v7", "random id", "identifier"],
    component: React.lazy(() =>
      import("../tools/uuid-generator").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_ulid_process",
    keywords: ["ulid", "generate", "id", "unique id", "sortable", "identifier", "time-based id"],
    component: React.lazy(() =>
      import("../tools/ulid-generator").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_nanoid_process",
    keywords: [
      "nanoid",
      "nano",
      "id",
      "generate",
      "random",
      "short id",
      "unique id",
      "url safe",
      "identifier",
      "compact",
    ],
    component: React.lazy(() =>
      import("../tools/nano-id-generator").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
      "claims",
      "payload",
      "header",
      "signature",
      "inspect token",
      "decode token",
      "auth token",
      "access token",
    ],
    component: React.lazy(() =>
      import("../tools/jwt/JwtTool").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
    sensitive: true,
  },
  {
    id: "basic-auth",
    name: "Basic Auth Header",
    description: "Encode or decode HTTP Basic Authorization headers.",
    category: "auth",
    displayCategory: "Auth",
    displayCategoryIcon: "lock",
    roles: ["backend", "general"],
    icon: "badge",
    platforms: ["desktop", "web"],
    rustCommand: "tool_basic_auth",
    sensitive: true,
    keywords: [
      "basic",
      "auth",
      "authorization",
      "header",
      "base64",
      "username",
      "password",
      "http auth",
      "authorization header",
      "encode credentials",
      "decode credentials",
      "username password",
    ],
    component: React.lazy(() =>
      import("../tools/basic-auth").then((m) => ({ default: m.default }))
    ),
    implemented: true,
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
    rustCommand: "tool_api_key_process",
    keywords: ["api", "key", "generate", "secret", "token", "random string", "generate token", "auth key"],
    component: React.lazy(() =>
      import("../tools/api-key-generator").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
    sensitive: true,
  },
  {
    id: "password-generator",
    name: "Password Generator",
    description: "Generate secure random passwords with configurable length, character sets, and strength indicator.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "security",
    roles: ["backend", "security", "general"],
    icon: "password",
    platforms: ["desktop", "web"],
    rustCommand: "tool_password_process",
    sensitive: true,
    keywords: [
      "password",
      "generate",
      "random",
      "secure",
      "entropy",
      "strength",
      "strong password",
      "random password",
      "passphrase",
      "credentials",
    ],
    component: React.lazy(() =>
      import("../tools/password-generator/PasswordGeneratorTool").then((m) => ({
        default: m.default,
      }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "rsa-keygen",
    name: "RSA Key Pair Generator",
    description:
      "Generate RSA public/private key pairs locally in PKCS#8 or PKCS#1 PEM format. Nothing leaves your device.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "security",
    roles: ["backend", "security", "devops"],
    icon: "key",
    platforms: ["desktop", "web"],
    rustCommand: "tool_rsa_keygen_process",
    sensitive: true,
    keywords: [
      "rsa",
      "key",
      "keypair",
      "public key",
      "private key",
      "pem",
      "pkcs8",
      "pkcs1",
      "asymmetric",
      "encryption",
      "signing",
      "certificate",
      "ssh",
      "openssl",
      "generate",
    ],
    component: React.lazy(() =>
      import("../tools/rsa-keygen").then((m) => ({ default: m.default }))
    ),
    trayPopover: false,
    implemented: true,
  },
  {
    id: "bcrypt",
    name: "Bcrypt Tool",
    description:
      "Hash passwords with bcrypt and verify hashes locally. Configurable cost factor. Nothing leaves your device.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "security",
    roles: ["backend", "security"],
    icon: "lock",
    platforms: ["desktop", "web"],
    rustCommand: "tool_bcrypt_process",
    sensitive: true,
    keywords: [
      "bcrypt",
      "hash",
      "password",
      "hashing",
      "verify",
      "cost",
      "salt",
      "kdf",
      "key derivation",
      "authentication",
      "security",
      "credential",
      "storage",
      "node",
      "php",
      "django",
    ],
    component: React.lazy(() =>
      import("../tools/bcrypt").then((m) => ({ default: m.default }))
    ),
    trayPopover: false,
    implemented: true,
  },
  {
    id: "passphrase-generator",
    name: "Passphrase Generator",
    description:
      "Generate memorable passphrases from a wordlist with configurable word count, separator, and extras.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "security",
    roles: ["backend", "security", "general"],
    icon: "abc",
    platforms: ["desktop", "web"],
    rustCommand: "tool_passphrase_process",
    sensitive: true,
    keywords: [
      "passphrase",
      "password",
      "words",
      "diceware",
      "memorable",
      "entropy",
      "random words",
      "mnemonic",
    ],
    component: React.lazy(() =>
      import("../tools/passphrase-generator/PassphraseGeneratorTool").then((m) => ({
        default: m.default,
      }))
    ),
    trayPopover: true,
    implemented: true,
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
    rustCommand: "tool_aes_process",
    sensitive: true,
    keywords: [
      "aes",
      "encrypt",
      "decrypt",
      "gcm",
      "symmetric",
      "cipher",
      "secret",
      "secret key",
      "encrypt text",
      "decrypt text",
    ],
    component: React.lazy(() =>
      import("../tools/aes-encrypt-decrypt/AesEncryptDecryptTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "totp-generator",
    name: "TOTP Generator",
    description:
      "Generate time-based OTP codes from a TOTP secret. Runs entirely offline.",
    category: "crypto",
    displayCategory: "Security",
    displayCategoryIcon: "security",
    roles: ["backend", "security", "general"],
    icon: "pin",
    platforms: ["desktop", "web"],
    rustCommand: "tool_totp_generate",
    sensitive: true,
    keywords: [
      "totp",
      "otp",
      "2fa",
      "mfa",
      "authenticator",
      "time",
      "one-time",
      "password",
      "secret",
      "two factor",
      "one time password",
      "google authenticator",
    ],
    trayPopover: true,
    component: React.lazy(() =>
      import("../tools/totp-generator/TotpGeneratorTool").then((m) => ({
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
    keywords: [
      "json",
      "format",
      "prettify",
      "minify",
      "beautify",
      "pretty print",
      "json file",
      "format json",
      "indent json",
      "compress json",
    ],
    component: React.lazy(() =>
      import("../tools/json-formatter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    keywords: [
      "json",
      "validate",
      "schema",
      "validate json",
      "check json",
      "json error",
      "json lint",
      "invalid json",
      "json syntax",
    ],
    component: React.lazy(() =>
      import("../tools/json-validator").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "json-schema-validator",
    name: "JSON Schema Validator",
    description:
      "Validate a JSON document against a JSON Schema (draft-07, 2019-09, 2020-12).",
    category: "json",
    displayCategory: "JSON Tools",
    displayCategoryIcon: "data_object",
    roles: ["backend", "frontend", "data", "general"],
    icon: "rule",
    platforms: ["desktop", "web"],
    rustCommand: "tool_json_schema_validate",
    keywords: [
      "json",
      "schema",
      "validate",
      "jsonschema",
      "draft",
      "draft7",
      "openapi",
      "validate schema",
      "json schema file",
      "draft-07",
      "openapi schema",
      "ajv",
      "validation errors",
    ],
    component: React.lazy(() =>
      import("../tools/json-schema-validator").then((m) => ({ default: m.default }))
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
    keywords: [
      "json",
      "diff",
      "compare",
      "compare json",
      "json difference",
      "json compare",
      "diff objects",
      "changed keys",
    ],
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
    keywords: [
      "json",
      "path",
      "query",
      "jq",
      "query json",
      "extract json",
      "jsonpath",
      "filter json",
      "select fields",
    ],
    component: React.lazy(() =>
      import("../tools/json-path").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    keywords: [
      "json",
      "yaml",
      "typescript",
      "csv",
      "xml",
      "convert",
      "transform",
      "json to yaml",
      "json to csv",
      "json to xml",
      "json to typescript",
      "convert json",
      "export json",
    ],
    component: React.lazy(() =>
      import("../tools/json-converter").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "config-converter",
    name: "Config Converter",
    description:
      "Convert between JSON, YAML, and TOML. All six directions supported.",
    category: "json",
    displayCategory: "JSON Tools",
    displayCategoryIcon: "data_object",
    roles: ["backend", "devops", "general"],
    icon: "swap_horiz",
    platforms: ["desktop", "web"],
    rustCommand: "tool_config_convert",
    sensitive: false,
    keywords: [
      "json",
      "yaml",
      "toml",
      "convert",
      "config",
      "cargo",
      "convert config",
      "json to toml",
      "yaml to json",
      "toml to json",
      "config file",
    ],
    component: React.lazy(
      () =>
        import("../tools/config-converter/ConfigConverterTool") as Promise<{
          default: React.ComponentType<unknown>;
        }>
    ),
    implemented: true,
  },
  {
    id: "csv-to-json",
    name: "CSV / JSON",
    description: "Convert between CSV and JSON in both directions.",
    category: "data",
    displayCategory: "Data",
    displayCategoryIcon: "table_chart",
    roles: ["backend", "data", "general"],
    icon: "table_chart",
    platforms: ["desktop", "web"],
    rustCommand: "tool_csv_to_json",
    keywords: [
      "csv",
      "json",
      "convert",
      "table",
      "json-to-csv",
      "bidirectional",
      "csv file",
      ".csv",
      "spreadsheet",
      "excel",
      "import csv",
      "convert csv",
      "tsv",
      "tab separated",
      "tab-separated",
      ".tsv",
      "tsv to json",
      "json to csv",
      "export csv",
    ],
    component: React.lazy(() =>
      import("../tools/csv-to-json/CsvToJsonTool").then((m) => ({
        default: m.default,
      }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "csv-previewer",
    name: "CSV Previewer",
    description: "Render CSV data as a formatted table for quick inspection.",
    category: "data",
    displayCategory: "Data",
    displayCategoryIcon: "table_chart",
    roles: ["backend", "data", "general"],
    icon: "table_view",
    platforms: ["desktop", "web"],
    rustCommand: "tool_csv_preview",
    keywords: [
      "csv",
      "preview",
      "table",
      "viewer",
      "inspect",
      "spreadsheet",
      "tsv",
      "tabular",
      "data",
      "columns",
      "rows",
    ],
    component: React.lazy(() =>
      import("../tools/csv-previewer").then((m) => ({
        default: m.default,
      }))
    ),
    trayPopover: false,
    implemented: true,
  },
  {
    id: "image-converter",
    name: "Image Converter",
    description:
      "Convert images between formats with resize, rotate, flip, and quality control.",
    category: "media",
    displayCategory: "Media",
    displayCategoryIcon: "image",
    roles: ["frontend", "general"],
    icon: "image",
    platforms: ["desktop"],
    rustCommand: "tool_image_convert",
    keywords: [
      "image",
      "convert",
      "png",
      "jpeg",
      "jpg",
      "webp",
      "bmp",
      "tiff",
      "ico",
      "tga",
      "gif",
      "resize",
      "rotate",
      "flip",
      "compress",
      "format",
      "photo",
    ],
    component: React.lazy(() =>
      import("../tools/image-converter/ImageConverterTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "xml-formatter",
    name: "XML Formatter",
    description: "Format and validate XML documents.",
    category: "data",
    displayCategory: "Data",
    displayCategoryIcon: "table_chart",
    roles: ["backend", "data", "general"],
    icon: "code",
    platforms: ["desktop", "web"],
    rustCommand: "tool_xml_format",
    keywords: [
      "xml",
      "format",
      "pretty",
      "indent",
      "validate",
      "markup",
      "xml file",
      ".xml",
      "prettify xml",
      "beautify xml",
      "soap",
      "rss",
      "sitemap",
      "format xml",
    ],
    trayPopover: false,
    component: React.lazy(() =>
      import("../tools/xml-formatter/XmlFormatterTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "html-formatter",
    name: "HTML Formatter",
    description:
      "Format and pretty-print HTML with configurable indent and attribute wrapping.",
    category: "code",
    displayCategory: "Code",
    displayCategoryIcon: "code",
    roles: ["frontend", "general"],
    icon: "html",
    platforms: ["desktop", "web"],
    rustCommand: "tool_html_format",
    keywords: [
      "html",
      "format",
      "formatter",
      "pretty print",
      "beautify",
      "indent",
      "minify",
      "tidy",
      "markup",
      "template",
      "dom",
      "structure",
    ],
    trayPopover: false,
    component: React.lazy(() =>
      import("../tools/html-formatter/HtmlFormatterTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "yaml-formatter",
    name: "YAML Formatter",
    description: "Format and validate YAML documents.",
    category: "data",
    displayCategory: "Data",
    displayCategoryIcon: "table_chart",
    roles: ["backend", "data", "general"],
    icon: "code",
    platforms: ["desktop", "web"],
    rustCommand: "tool_yaml_format",
    keywords: [
      "yaml",
      "format",
      "pretty",
      "validate",
      "yml",
      "config",
      "yaml file",
      ".yaml",
      ".yml",
      "prettify yaml",
      "format yaml",
      "docker compose",
      "kubernetes",
      "k8s",
      "ansible",
    ],
    trayPopover: false,
    component: React.lazy(() =>
      import("../tools/yaml-formatter/YamlFormatterTool").then((m) => ({
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
    keywords: [
      "url",
      "parse",
      "query",
      "host",
      "path",
      "fragment",
      "parse url",
      "url components",
      "query params",
      "hostname",
      "pathname",
      "protocol",
      "inspect url",
      "url breakdown",
    ],
    component: React.lazy(() =>
      import("../tools/url-parser/UrlParserTool").then((m) => ({
        default: m.default,
      }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "cidr-calculator",
    name: "CIDR Calculator",
    description:
      "Calculate network address, broadcast, host range and mask from a CIDR.",
    category: "network",
    displayCategory: "Network",
    displayCategoryIcon: "router",
    roles: ["devops", "backend"],
    icon: "lan",
    platforms: ["desktop", "web"],
    rustCommand: "tool_cidr_calculate",
    keywords: [
      "cidr",
      "subnet",
      "network",
      "ip",
      "mask",
      "broadcast",
      "ipv4",
      "ipv6",
      "network mask",
      "ip range",
      "subnetting",
      "network address",
      "/24",
      "vpc",
    ],
    component: React.lazy(() =>
      import("../tools/cidr-calculator").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "http-status-codes",
    name: "HTTP Status Codes",
    description: "Reference for all HTTP status codes with descriptions.",
    category: "network",
    displayCategory: "Network",
    displayCategoryIcon: "router",
    roles: ["frontend", "backend", "general"],
    icon: "http",
    platforms: ["desktop", "web"],
    keywords: [
      "http",
      "status",
      "code",
      "200",
      "301",
      "302",
      "400",
      "401",
      "403",
      "404",
      "405",
      "409",
      "429",
      "500",
      "502",
      "503",
      "504",
      "ok",
      "redirect",
      "not found",
      "error",
      "forbidden",
      "unauthorized",
      "rate limit",
      "timeout",
      "bad request",
      "conflict",
      "server error",
      "status code lookup",
      "http error",
      "rest api",
      "response code",
    ],
    component: React.lazy(() =>
      import("../tools/http-status-codes").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "curl-builder",
    name: "cURL Builder",
    description: "Compose and export cURL commands from a structured form.",
    category: "network",
    displayCategory: "Network",
    displayCategoryIcon: "router",
    roles: ["backend", "frontend", "devops", "general"],
    icon: "terminal",
    platforms: ["desktop", "web"],
    keywords: [
      "curl",
      "http",
      "request",
      "api",
      "rest",
      "headers",
      "bearer token",
      "basic auth",
      "api key",
      "post",
      "get",
      "put",
      "patch",
      "delete",
      "body",
      "json",
      "form data",
      "command",
      "cli",
      "fetch",
      "http client",
      "request builder",
      "api testing",
    ],
    component: React.lazy(() =>
      import("../tools/curl-builder/CurlBuilderTool").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "user-agent-parser",
    name: "User-Agent Parser",
    description: "Parse a User-Agent string into browser, OS, device, and engine details.",
    category: "network",
    displayCategory: "Network",
    displayCategoryIcon: "router",
    roles: ["backend", "frontend", "devops", "general"],
    icon: "devices",
    platforms: ["desktop", "web"],
    rustCommand: "tool_ua_parse",
    keywords: [
      "user agent",
      "ua",
      "browser",
      "chrome",
      "firefox",
      "safari",
      "edge",
      "opera",
      "os",
      "operating system",
      "device",
      "mobile",
      "desktop",
      "bot",
      "crawler",
      "googlebot",
      "spider",
      "engine",
      "blink",
      "gecko",
      "webkit",
      "http header",
      "request header",
      "parse",
      "inspect",
    ],
    component: React.lazy(() =>
      import("../tools/user-agent-parser/UserAgentParserTool").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "mac-address",
    name: "MAC Address Tool",
    description:
      "Normalize MAC address formats, inspect type and scope, look up the vendor OUI, and generate random locally-administered MACs.",
    category: "network",
    displayCategory: "Network",
    displayCategoryIcon: "router",
    roles: ["backend", "general"],
    icon: "device_hub",
    platforms: ["desktop", "web"],
    keywords: [
      "mac address",
      "mac",
      "ethernet",
      "hardware address",
      "nic",
      "oui",
      "vendor",
      "manufacturer",
      "network interface",
      "colon",
      "hyphen",
      "cisco",
      "eui-48",
      "locally administered",
      "random mac",
      "unicast",
      "multicast",
      "global",
      "local",
      "spoofing",
    ],
    component: React.lazy(() =>
      import("../tools/mac-address/MacAddressTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "env-parser",
    name: "Config Parser",
    description:
      "Parse and validate .env, .properties, and .ini config files. Spot duplicates, empty values, and syntax errors.",
    category: "text",
    displayCategory: "Code",
    displayCategoryIcon: "code",
    roles: ["frontend", "backend", "devops"],
    icon: "settings_applications",
    platforms: ["desktop", "web"],
    rustCommand: "tool_env_parse",
    sensitive: true,
    keywords: [
      "env",
      "dotenv",
      "properties",
      "ini",
      "config",
      "environment",
      "variables",
      "parse",
      ".env file",
      "environment variables",
      "env file",
      ".properties",
      ".ini",
      "config file",
      "parse env",
    ],
    component: React.lazy(() =>
      import("../tools/env-parser").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "line-tools",
    name: "Line Tools",
    description: "Sort, deduplicate, reverse, and clean lines of text.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_align_left",
    roles: ["frontend", "backend", "general"],
    icon: "sort",
    platforms: ["desktop", "web"],
    rustCommand: "tool_line_tools_process",
    keywords: [
      "sort",
      "deduplicate",
      "reverse",
      "lines",
      "trim",
      "clean",
      "text",
      "sort lines",
      "dedupe",
      "remove duplicates",
      "unique lines",
      "sort text",
    ],
    component: React.lazy(() =>
      import("../tools/line-tools").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "fake-data-generator",
    name: "Fake Data Generator",
    description: "Generate realistic fake records for testing and development.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["backend", "frontend", "general"],
    icon: "dataset",
    platforms: ["desktop", "web"],
    rustCommand: "tool_fake_data_process",
    keywords: [
      "fake",
      "mock",
      "dummy",
      "test data",
      "seed",
      "fixture",
      "name",
      "email",
      "address",
      "company",
      "lorem",
      "json",
      "csv",
      "generate",
      "random",
      "faker",
      "database seed",
      "test fixture",
      "sample data",
      "development data",
      "placeholder",
    ],
    component: React.lazy(() =>
      import("../tools/fake-data-generator/FakeDataGeneratorTool").then((m) => ({
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
    rustCommand: "tool_case_process",
    keywords: [
      "text",
      "case",
      "camel",
      "snake",
      "lower",
      "upper",
      "camelcase",
      "snake_case",
      "kebab-case",
      "pascalcase",
      "uppercase",
      "lowercase",
      "title case",
      "rename",
      "variable name",
    ],
    component: React.lazy(() =>
      import("../tools/text-case-converter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_word_counter_process",
    keywords: [
      "word",
      "count",
      "character",
      "line",
      "character count",
      "letter count",
      "reading time",
      "text stats",
      "count words",
      "text length",
    ],
    component: React.lazy(() =>
      import("../tools/word-counter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "unicode-inspector",
    name: "Unicode Inspector",
    description:
      "Inspect each character — codepoint, name, block, and UTF-8 bytes.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["frontend", "backend", "general"],
    icon: "language",
    platforms: ["desktop", "web"],
    rustCommand: "tool_unicode_inspect",
    keywords: [
      "unicode",
      "character",
      "codepoint",
      "utf8",
      "inspect",
      "hex",
      "character info",
      "utf-8",
      "emoji",
      "inspect character",
      "unicode lookup",
      "character encoding",
    ],
    component: React.lazy(() =>
      import("../tools/unicode-inspector").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "slug-generator",
    name: "Slug Generator",
    description: "Convert any string to a URL-safe slug.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_indent_increase",
    roles: ["frontend", "backend", "general"],
    icon: "link",
    platforms: ["desktop", "web"],
    rustCommand: "tool_slug_generate",
    keywords: [
      "slug",
      "url",
      "kebab",
      "path",
      "seo",
      "permalink",
      "url slug",
      "seo url",
      "url friendly",
      "sanitize url",
      "title to url",
    ],
    component: React.lazy(() =>
      import("../tools/slug-generator").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "nato-phonetic",
    name: "NATO Phonetic Alphabet",
    description:
      "Spell out text using NATO phonetic words (Alpha, Bravo, Charlie…) and decode them back.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "sort",
    roles: ["general"],
    icon: "record_voice_over",
    platforms: ["desktop", "web"],
    rustCommand: "tool_nato_phonetic_process",
    keywords: [
      "nato",
      "phonetic",
      "alphabet",
      "alpha",
      "bravo",
      "charlie",
      "spelling",
      "phone",
      "radio",
      "icao",
      "aviation",
      "military",
      "spell out",
    ],
    component: React.lazy(() =>
      import("../tools/nato-phonetic").then((m) => ({ default: m.default }))
    ),
    trayPopover: false,
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
    rustCommand: "tool_string_escaper_process",
    keywords: [
      "string",
      "escape",
      "unescape",
      "json",
      "escape string",
      "backslash",
      "quotes",
      "json escape",
      "regex escape",
    ],
    component: React.lazy(() =>
      import("../tools/string-escaper").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_find_replace_process",
    keywords: [
      "find",
      "replace",
      "regex",
      "search",
      "search replace",
      "bulk replace",
      "text substitution",
      "replace all",
      "regex replace",
    ],
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
    rustCommand: "tool_text_diff_process",
    keywords: [
      "text",
      "diff",
      "compare",
      "difference",
      "lines",
      "compare text",
      "diff text",
      "text compare",
      "find changes",
      "before after",
    ],
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
    rustCommand: "tool_lorem_ipsum_process",
    keywords: [
      "lorem",
      "ipsum",
      "placeholder",
      "dummy",
      "text",
      "placeholder text",
      "dummy text",
      "filler text",
      "sample text",
      "mockup",
    ],
    component: React.lazy(() =>
      import("../tools/lorem-ipsum").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "markdown-editor",
    name: "Markdown Editor",
    description:
      "Write and preview Markdown with GFM, syntax highlighting, and live preview.",
    category: "text",
    displayCategory: "Formatting",
    displayCategoryIcon: "format_align_left",
    roles: ["frontend", "backend", "general"],
    icon: "edit_note",
    platforms: ["desktop", "web"],
    keywords: [
      "markdown",
      "md",
      "preview",
      "editor",
      "gfm",
      "write",
      "format",
      "render",
      "md file",
      ".md",
      "render markdown",
      "markdown preview",
      "github markdown",
      "readme",
    ],
    component: React.lazy(() =>
      import("../tools/markdown-editor").then((m) => ({ default: m.default }))
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
    rustCommand: "tool_timestamp_process",
    keywords: [
      "timestamp",
      "unix",
      "date",
      "time",
      "unix time",
      "epoch",
      "milliseconds",
      "date convert",
      "utc",
      "unix epoch",
      "date to timestamp",
      "timestamp to date",
    ],
    component: React.lazy(() =>
      import("../tools/timestamp-converter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_timezone_process",
    keywords: [
      "timezone",
      "tz",
      "convert",
      "utc",
      "time zone",
      "utc offset",
      "convert time",
      "dst",
      "meeting time",
      "world clock",
    ],
    component: React.lazy(() =>
      import("../tools/timezone-converter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_iso8601_process",
    keywords: [
      "iso8601",
      "iso",
      "date",
      "format",
      "date format",
      "iso date",
      "datetime",
      "date string",
      "rfc3339",
      "date parse",
    ],
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
    rustCommand: "tool_cron_process",
    keywords: [
      "cron",
      "schedule",
      "expression",
      "job",
      "interval",
      "timer",
      "cron job",
      "cron syntax",
      "next run",
      "scheduled task",
      "crontab",
    ],
    component: React.lazy(() =>
      import("../tools/cron-parser/CronParserTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "date-calculator",
    name: "Date Calculator",
    description:
      "Calculate age, duration between two moments, or add/subtract a duration from a date.",
    category: "datetime",
    displayCategory: "Date & Time",
    displayCategoryIcon: "calendar_today",
    roles: ["general", "backend", "data"],
    icon: "date_range",
    platforms: ["desktop", "web"],
    keywords: [
      "age",
      "birthday",
      "date of birth",
      "how old",
      "anniversary",
      "dob",
      "duration",
      "time between",
      "elapsed",
      "time difference",
      "hours minutes seconds",
      "date difference",
      "how long",
      "add time",
      "subtract time",
      "date math",
      "iso 8601 duration",
      "countdown",
      "interval",
      "years months days",
    ],
    component: React.lazy(() =>
      import("../tools/date-calculator/DateCalculatorTool").then((m) => ({
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
    rustCommand: "tool_base_converter_process",
    keywords: [
      "number",
      "base",
      "hex",
      "binary",
      "decimal",
      "octal",
      "hexadecimal",
      "number system",
      "convert number",
      "base 2",
      "base 16",
    ],
    component: React.lazy(() =>
      import("../tools/number-base-converter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
    implemented: true,
  },
  {
    id: "semver",
    name: "Semver",
    description:
      "Parse semantic versions, compare ordering, check range requirements, and copy next major, minor, or patch versions.",
    category: "numbers",
    displayCategory: "Numbers",
    displayCategoryIcon: "numbers",
    roles: ["backend", "devops", "general"],
    icon: "account_tree",
    platforms: ["desktop", "web"],
    rustCommand: "tool_semver_process",
    keywords: [
      "semver",
      "version",
      "semantic",
      "npm",
      "cargo",
      "release",
      "bump",
      "semantic version",
      "version bump",
      "major minor patch",
      "npm version",
      "package version",
      "version compare",
    ],
    component: React.lazy(() =>
      import("../tools/semver").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "unit-converter",
    name: "Unit Converter",
    description:
      "Convert between units of data size, time, temperature, length, weight, speed, angle, and frequency.",
    category: "numbers",
    displayCategory: "Numbers",
    displayCategoryIcon: "numbers",
    roles: ["frontend", "backend", "general"],
    icon: "straighten",
    platforms: ["desktop", "web"],
    rustCommand: "tool_unit_convert",
    keywords: [
      "unit",
      "convert",
      "data",
      "size",
      "time",
      "temperature",
      "length",
      "weight",
      "speed",
      "bytes",
      "mb",
      "km",
      "celsius",
      "angle",
      "radian",
      "degree",
      "frequency",
      "hertz",
      "megahertz",
      "convert units",
      "mb to gb",
      "celsius fahrenheit",
      "km miles",
      "data size",
    ],
    component: React.lazy(() =>
      import("../tools/unit-converter").then((m) => ({ default: m.default }))
    ),
    trayPopover: true,
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
    rustCommand: "tool_bitwise_process",
    keywords: [
      "bitwise",
      "and",
      "or",
      "xor",
      "shift",
      "bit operations",
      "binary math",
      "bitmask",
      "flags",
    ],
    component: React.lazy(() =>
      import("../tools/bitwise-calculator").then((m) => ({ default: m.default }))
    ),
    implemented: true,
  },
  {
    id: "chmod-calculator",
    name: "chmod Calculator",
    description:
      "Parse Unix permission strings (755, rwxr-xr-x) and see all representations with a plain-English breakdown.",
    category: "numbers",
    displayCategory: "Numbers",
    displayCategoryIcon: "numbers",
    roles: ["backend", "devops"],
    icon: "lock_open",
    platforms: ["desktop", "web"],
    rustCommand: "tool_chmod_process",
    sensitive: false,
    keywords: [
      "chmod",
      "permissions",
      "unix",
      "linux",
      "octal",
      "symbolic",
      "rwx",
      "file permissions",
      "unix permissions",
      "linux permissions",
      "octal permissions",
      "755",
      "644",
    ],
    component: React.lazy(
      () =>
        import("../tools/chmod-calculator/ChmodCalculatorTool") as Promise<{
          default: React.ComponentType<unknown>;
        }>
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
    keywords: [
      "expression",
      "eval",
      "calculator",
      "calculate",
      "math",
      "formula",
      "arithmetic",
      "compute",
    ],
    component: React.lazy(() =>
      import("../tools/expression-evaluator").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "color-contrast",
    name: "Colour Contrast Checker",
    description:
      "Check foreground/background colour pairs against WCAG AA and AAA contrast ratio requirements.",
    category: "numbers",
    displayCategory: "Numbers",
    displayCategoryIcon: "numbers",
    roles: ["frontend", "general"],
    icon: "contrast",
    platforms: ["desktop", "web"],
    rustCommand: "tool_color_contrast_process",
    keywords: [
      "colour",
      "color",
      "contrast",
      "wcag",
      "accessibility",
      "a11y",
      "hex",
      "foreground",
      "background",
      "ratio",
      "aa",
      "aaa",
    ],
    component: React.lazy(() =>
      import("../tools/color-contrast/ColorContrastTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "keycode-info",
    name: "Keycode Info",
    description: "Press any key to inspect its keyCode, code, key, and modifiers.",
    category: "code",
    displayCategory: "Code",
    displayCategoryIcon: "code",
    roles: ["frontend", "general"],
    icon: "keyboard",
    platforms: ["desktop", "web"],
    keywords: [
      "keycode",
      "key code",
      "keyboard",
      "event",
      "keydown",
      "key",
      "code",
      "which",
      "charCode",
      "modifier",
      "shortcut",
      "hotkey",
      "keybinding",
      "javascript",
      "browser",
      "input",
      "event listener",
    ],
    component: React.lazy(() =>
      import("../tools/keycode-info/KeycodeInfoTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
    trayPopover: true,
  },
  {
    id: "mime-lookup",
    name: "MIME Type Lookup",
    description: "Look up MIME types from file extensions and vice versa.",
    category: "code",
    displayCategory: "Code",
    displayCategoryIcon: "code",
    roles: ["frontend", "backend", "general"],
    icon: "find_in_page",
    platforms: ["desktop", "web"],
    keywords: [
      "mime",
      "mime type",
      "content-type",
      "media type",
      "file extension",
      "file type",
      "http header",
      "application/json",
      "image/png",
      "text/html",
      "accept header",
      "content type",
      "upload",
      "file upload",
      "server",
    ],
    component: React.lazy(() =>
      import("../tools/mime-lookup/MimeLookupTool").then((m) => ({
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
      "format code",
      "beautify code",
      "indent",
      "css format",
      "html format",
      "markdown format",
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
    keywords: [
      "sql",
      "format",
      "beautify",
      "query",
      "prettify sql",
      "beautify sql",
      "format query",
      "sql file",
      "sql indent",
      "mysql",
      "postgres",
      "sqlite",
    ],
    component: React.lazy(() =>
      import("../tools/sql-formatter/SqlFormatterTool").then((m) => ({
        default: m.default,
      }))
    ),
    implemented: true,
  },
  {
    id: "css-gradient",
    name: "CSS Gradient Generator",
    description:
      "Build linear, radial, and conic CSS gradients with a live preview.",
    category: "design",
    displayCategory: "Design",
    displayCategoryIcon: "gradient",
    roles: ["frontend", "general"],
    icon: "gradient",
    platforms: ["desktop", "web"],
    keywords: [
      "css",
      "gradient",
      "linear",
      "radial",
      "conic",
      "background",
      "color",
      "colour",
      "design",
      "ui",
      "style",
      "frontend",
    ],
    component: React.lazy(() =>
      import("../tools/css-gradient/CssGradientTool").then((m) => ({
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
