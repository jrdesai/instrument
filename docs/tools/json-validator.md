# JSON Validator

Validate JSON input and see either a **structure summary** (when valid) or **error details with location** (when invalid).

## What it validates

- **Syntax**: The tool parses input as JSON. Invalid syntax produces an error message with line and column.
- **Structure summary** (valid only): Root type, depth, counts of objects, arrays, strings, numbers, booleans, nulls, total keys, longest array length.
- **Duplicate keys**: If any object in the raw JSON contains the same key more than once, a warning is shown. Note: `serde_json` (and most parsers) keep only the last value for duplicate keys; the validator detects their presence so you can fix the source.

## Structure summary

When the input is valid JSON you get:

- **Root type**: `object`, `array`, `string`, `number`, `boolean`, or `null`.
- **Depth**: Maximum nesting level.
- **Keys**: Total number of keys across all objects.
- **Objects / Arrays**: Number of object and array values.
- **Strings / Numbers / Booleans / Nulls**: Count of each primitive type.
- **Longest array**: Length of the largest array in the document.

Only non-zero counts are shown.

## Duplicate key detection

JSON allows duplicate keys in an object, but most parsers (including JavaScript’s `JSON.parse` and Rust’s `serde_json`) keep only one value per key. The validator scans the raw text and warns when it finds duplicate keys in the same object so you can correct the data or schema.

## Common JSON mistakes

The invalid state includes a collapsible “Common JSON mistakes” section with tips such as:

- Keys must be quoted: `"key"` not `key`
- No trailing commas after the last item
- Strings use double quotes, not single quotes
- No comments allowed in JSON
- No `undefined` or function values

Use this when fixing reported errors.
