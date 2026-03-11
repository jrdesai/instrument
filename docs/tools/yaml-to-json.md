## YAML to JSON

The **YAML to JSON** tool converts YAML input into pretty-printed JSON with optional key sorting and configurable indentation.

### Features

- **YAML → JSON conversion** using the same `serde_yaml` / `serde_json` stack as other Instrument JSON tools.
- **Indent control**: choose between 2-space and 4-space JSON output.
- **Key sorting**: optionally sort object keys recursively for stable diffs and reviews.
- **Error reporting**: shows parse errors with line and column when available.
- **Anchor and alias resolution**: YAML anchors (`&`) and aliases (`*`) are resolved into regular JSON structures.
- **Type mapping**:
  - YAML booleans → JSON booleans (`true` / `false`).
  - YAML null (`~`, `null`, empty value) → JSON `null`.
  - YAML numbers → JSON numbers (integer or float).
  - YAML strings → JSON strings, including multiline block scalars.

### CLI equivalents

The desktop tool is backed by the `yaml_to_json` logic in `instrument-core`. A future CLI will expose similar behaviour, conceptually equivalent to:

- Convert YAML to JSON with default options:

```bash
instrument yaml to-json < input.yaml
```

- Convert with 4-space indent and sorted keys:

```bash
instrument yaml to-json --indent 4 --sort-keys < input.yaml
```

