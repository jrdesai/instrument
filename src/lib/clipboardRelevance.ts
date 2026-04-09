/**
 * Returns true if the clipboard text is plausibly relevant for the given tool.
 * Keeps false-positives conservative — when unsure, return true (paste anyway).
 * The user can always clear the input.
 */
export function isClipboardRelevant(toolId: string, text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  const SHORT = 2000;
  const MEDIUM = 10000;

  switch (toolId) {
    case "jwt":
      return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(t);

    case "totp-generator": {
      const stripped = text.replace(/\s/g, "");
      return (
        stripped.length >= 16 &&
        stripped.length <= 64 &&
        /^[A-Z2-7]+=*$/i.test(stripped)
      );
    }

    case "hex-converter":
      return /^[0-9a-fA-F\s]+$/.test(t) && t.length <= SHORT;

    case "color-converter":
      return /^(#[0-9a-fA-F]{3,8}|rgb|hsl|oklch|[a-z]+)/i.test(t) && t.length < 100;

    case "base64-encoder":
      return /^[A-Za-z0-9+/=_-]+$/.test(t.replace(/\s/g, "")) && t.length <= SHORT;

    case "hash":
      return t.length <= MEDIUM;

    case "json-validator":
    case "json-formatter":
    case "json-path":
    case "json-converter":
    case "json-schema-validator":
    case "json-diff":
      return /^\s*(?:\[|{|")/.test(t) && t.length <= MEDIUM;

    case "url-encoder":
    case "url-parser":
      if (t.length > SHORT) return false;
      return (
        /:\/\/\S+/.test(t) ||
        /^www\.\S+/i.test(t) ||
        /^mailto:\S+/i.test(t) ||
        /^data:\S+/i.test(t)
      );

    case "timestamp-converter":
      return /^\d+$/.test(t) || /^\d{4}-\d{2}-\d{2}/.test(t);

    case "unit-converter":
    case "number-base-converter":
      return /^-?[\d.,]+$/.test(t) && t.length < 30;

    case "regex-tester":
      return t.length <= SHORT;

    case "word-counter":
    case "text-case-converter":
    case "string-escaper":
    case "html-entity":
      return t.length <= MEDIUM;

    case "qr-code":
      return t.length <= 500;

    case "cert-decoder":
      return t.includes("-----BEGIN");

    case "cidr-calculator":
      return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/.test(t);

    case "uuid-generator":
    case "ulid-generator":
    case "nano-id-generator":
    case "api-key-generator":
    case "password-generator":
    case "passphrase-generator":
      return false;

    case "timezone-converter":
      return t.length <= SHORT;

    default:
      return t.length <= SHORT;
  }
}
