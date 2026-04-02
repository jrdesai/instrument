# JSON Schema Validator

Validates a JSON document against a JSON Schema locally. Supported drafts: **Draft 7**, **2019-09**, and **2020-12** (selectable in the tool). Uses the `jsonschema` Rust crate with remote reference fetching disabled so validation stays offline.

**Inputs:** JSON document (string), JSON Schema (string), draft selector.

**Output:** `valid`, `errorCount`, `issues` (instance path, message, schema path), or a `parseError` when JSON parsing or schema compilation fails.
