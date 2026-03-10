# JSON Converter

Convert JSON documents into other formats: **YAML**, **TypeScript**, **CSV**, and **XML**.

## Supported targets

- **YAML** — Serialize any valid JSON into a YAML representation.
- **TypeScript** — Infer interfaces and types from JSON structure.
- **CSV** — Flatten arrays of objects into CSV rows with a header row.
- **XML** — Render JSON as nested XML elements with a configurable root tag.

## TypeScript options

When **TypeScript** is selected:

- **Interface name** — Root name for the main type (default: `Root`).
- **Export** — When enabled, all interfaces and the root type are prefixed with `export`.
- **Optional fields** — When enabled, all object fields become optional (`field?: type`).

Type inference rules:

- **Primitives**:
  - Numbers → `number`
  - Booleans → `boolean`
  - Strings → `string`
  - Null → `null`
- **Objects**:
  - Generate an `interface` with keys as fields and recursively inferred types.
  - Interface names are derived from key names in **PascalCase** (`user_profile` → `UserProfile`).
- **Arrays**:
  - Empty arrays → `unknown[]`.
  - Arrays of objects → element interface (e.g. `User[]`), using a singularised form of the key name.
  - Arrays of primitives → union where needed, e.g. `(number | string | boolean | null)[]`.

Interfaces are emitted in dependency order (nested types first, root last), followed by a root `type` alias:

```ts
export interface User {
  name: string;
  roles: string[];
}

export type Root = User[];
```

## CSV limitations and warnings

CSV output expects:

- A **JSON array** at the root, or
- A **single object** (automatically wrapped into an array with a warning).

Behaviour:

- Array of objects → all unique keys across all objects become the header row.
- Missing keys for an object → empty cell.
- Array of primitives → single-column CSV with header `value`.
- Non-array/non-object root → error (`"CSV requires a JSON array or object"`).
- Nested objects/arrays in fields are JSON-serialized into a single cell and a warning is shown:

> `Nested objects serialised as JSON`

CSV is emitted with CRLF line endings and fields containing commas/newlines/quotes are quoted with `"` and internal quotes are escaped (`"` → `""`).

## XML key sanitisation rules

XML output wraps everything in a configurable root element:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
  ...
</root>
```

Rules:

- All keys become tag names; invalid XML tag characters are replaced with `_`.
- Tags that would start with a digit are prefixed with `_` (e.g. `123key` → `_123key`).
- Strings and numbers become text nodes:
  - Special characters are escaped: `&`, `<`, `>`, `"`, `'`.
- Arrays:
  - Each element is rendered as a repeated tag under its parent.
- Objects:
  - Keys become child elements under the parent tag.
- Null values:
  - Rendered as self-closing tags: `<field />`.

The **Root element** option lets you override the outer tag name (e.g. `data`, `items`).

## CLI equivalents

If you expose the same logic via a CLI, common patterns would look like:

```bash
instrument json convert --to yaml < data.json
instrument json convert --to typescript < data.json
instrument json convert --to csv < data.json
instrument json convert --to xml --root items < data.json
```

In the desktop app, the JSON Converter wraps these behaviours into a single tool with live previews and copy-to-clipboard support.

