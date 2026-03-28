# Config Converter

Convert between **JSON**, **YAML**, and **TOML** in any direction (six combinations). Parsing uses `serde_json`, `serde_yaml`, and the `toml` crate; the intermediate representation is `serde_json::Value`, so some edge cases (e.g. values that cannot be expressed in the target format) surface as clear errors.

## Desktop and web

The tool is available on desktop (Tauri) and web (WASM) via the `tool_config_convert` command, with the same behaviour on both platforms.

## Privacy

Input and output stay on the device. This tool is not marked sensitive; avoid pasting secrets anyway.

## Implementation

- Core logic: `src-core/instrument-core/src/json/config_converter.rs`
- Desktop: `src-core/instrument-desktop/src/commands/json.rs` (`tool_config_convert`)
- WASM: `src-core/instrument-web/src/lib.rs` (`tool_config_convert`)
