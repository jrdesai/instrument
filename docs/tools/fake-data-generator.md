# Fake Data Generator

Build a flat schema (field names and data types), choose how many records to generate, and get a pretty-printed JSON array. Download as JSON or CSV. Generation runs entirely in Rust (`fake` crate) — desktop native or WASM in the browser — with no network calls.

## Use cases

- **Seeding databases** — Counter IDs, names, emails, and related columns in one pass.
- **Tests and fixtures** — Repeatable shapes with optional ranges and custom pick-lists.
- **Mocks and prototypes** — Realistic-looking rows without wiring a backend.

## Field types

Person, address, company, internet, lorem-style text, numbers (integer with range, float with decimals, boolean), UUID, dates/timestamps, plus **Custom list** (comma-separated values, random pick per row) and **Counter** (start + step × record index).

## Limits

- At least one field with a non-blank name is required.
- Record count is clamped to **500** in core logic.

## Input / output

- **Input:** `fields[]` with `name`, `fieldType`, optional `params`; `count`.
- **Output:** `json` (pretty-printed array) and optional `error` string.

## Options in the UI

Param rows appear under types that need them (ranges, custom list values, counter start/step). Schema and count are draft-restored when you leave and return to the tool.
