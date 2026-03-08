# JSON Formatter

Format, minify, or compact JSON with optional key sorting and configurable indentation.

## Description

The JSON Formatter tool helps you:

- **Pretty-print** JSON with 2- or 4-space indentation for readability
- **Minify** JSON to a single line with no extra whitespace (e.g. for APIs or config)
- **Compact** JSON to a single line with minimal spaces after `:` and `,` for a balance of size and scanability
- **Sort keys** alphabetically across the whole tree for stable diffs or canonical output

## Modes

| Mode    | Output style | Use case |
|---------|--------------|----------|
| Pretty  | Indented, multi-line | Reading, editing, commits |
| Minify  | Single line, no spaces | Payloads, bundle size |
| Compact | Single line, `: ` and `, ` | Logs, one-line view |

## Sort keys

When **Sort keys** is on, every object in the JSON has its keys sorted alphabetically. This is useful for:

- **Diffs** — same data produces the same string, so changes show only real differences
- **Canonical form** — consistent ordering for hashing or comparison
- **Readability** — keys in a predictable order

## Indent (Pretty mode only)

- **2** — default, common in configs and APIs
- **4** — more spacing for deeply nested structures

## Error reporting

If the input is not valid JSON, the tool shows:

- **✗ Invalid JSON** and the parser error message
- **Line and column** when the backend provides them (e.g. "Line 3, Column 12: expected value")

This helps you fix syntax errors quickly.
