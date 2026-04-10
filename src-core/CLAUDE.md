# src-core — Rust Quick Reference

> Loaded when working in the Rust workspace. See root CLAUDE.md for full project context.

## Workspace layout

```
src-core/
├── instrument-core/     # Pure Rust — tool logic only. No Tauri, no WASM, no fs, no tokio.
├── instrument-desktop/  # Tauri command wrappers → delegates to instrument-core
└── instrument-web/      # wasm-bindgen wrappers → delegates to instrument-core
```

## Adding a module to instrument-core

1. Create `src-core/instrument-core/src/<category>/<name>.rs`
2. Add `pub mod <name>;` to `src-core/instrument-core/src/<category>/mod.rs`
3. Verify `pub use` in `lib.rs` if needed

## Struct pattern (all structs)

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FooInput { ... }
```

Required derives: `Debug, Clone, Serialize, Deserialize, TS, Type`  
Always: `#[serde(rename_all = "camelCase")]`  
Always: `#[ts(export)]`

## Desktop command pattern

```rust
#[tauri::command]
#[specta::specta]
pub fn tool_foo(input: FooInput) -> FooOutput {
    let start = Instant::now();
    let output = foo_core(input);
    finish_ok("tool_foo", start);  // or finish_result() for Result returns
    output
}
```

Never log input/output values — only tool name, duration, error message text.

## WASM binding pattern

```rust
#[wasm_bindgen(js_name = tool_foo)]
pub fn foo_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: FooInput = from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: FooOutput = foo_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}
```

## Registering a new command

Add to `collect_commands![]` in `src-tauri/src/lib.rs`:
```rust
instrument_desktop::commands::<category>::tool_foo,
```

## Purity rules (instrument-core)

No `std::fs`, `tokio`, `tauri`, or `wasm-bindgen` imports — ever.  
Run `pnpm run check:pure` to verify after adding any dependency.

## Error handling

Use `thiserror` for library errors. Never `panic!` or `unwrap()` in library code.  
Return `Result<Output, YourError>` or put `error: Option<String>` on the output struct (preferred for tools — simpler WASM bridge).

## After any Rust change

```bash
pnpm run build:wasm        # recompile → public/wasm-pkg/
git add public/wasm-pkg/
git commit -m "chore: rebuild wasm-pkg ..."
```
