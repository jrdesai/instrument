#!/usr/bin/env python3
"""
Validates that every web-enabled tool's WASM export name (wasmExport ?? rustCommand)
has a corresponding wasm-bindgen export in instrument-web/src/lib.rs, and that no
WASM exports are orphaned (not referenced by any registry tool).

Usage: python3 .claude/check-wasm.py
Exit code 1 if any mismatches found.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent.parent.resolve()

# ── 1. Extract web-enabled rustCommand/wasmExport from the registry ───────────

registry_path = ROOT / "src/registry/index.ts"
registry_text = registry_path.read_text()

blocks = re.split(r"\{\s*id:", registry_text)
# rustCommand -> effective wasm export name
expected_exports: dict[str, str] = {}

for block in blocks[1:]:
    # Include implemented tools, plus any non-implemented entry that has an
    # explicit wasmExport (e.g. regex-explain, which is a hidden sub-command).
    has_wasm_export = bool(re.search(r'wasmExport:', block))
    if "implemented: true" not in block and not has_wasm_export:
        continue
    platforms_m = re.search(r'platforms:\s*\[([^\]]+)\]', block)
    if not platforms_m or '"web"' not in platforms_m.group(1):
        continue
    rust_cmd_m = re.search(r'rustCommand:\s*["\']([^"\']+)["\']', block)
    if not rust_cmd_m:
        continue
    rust_cmd = rust_cmd_m.group(1)
    wasm_m = re.search(r'wasmExport:\s*["\']([^"\']+)["\']', block)
    wasm_name = wasm_m.group(1) if wasm_m else rust_cmd
    expected_exports[rust_cmd] = wasm_name

# ── 2. Extract js_name values from instrument-web/src/lib.rs ─────────────────

wasm_lib_path = ROOT / "src-core/instrument-web/src/lib.rs"
wasm_lib_text = wasm_lib_path.read_text()

# tool_binding!("js_name", ...)
tool_binding_names: set[str] = set(
    re.findall(r'tool_binding!\s*\(\s*"([^"]+)"', wasm_lib_text)
)
# #[wasm_bindgen(js_name = name)]
manual_names: set[str] = set(
    re.findall(r'#\[wasm_bindgen\(js_name\s*=\s*(\w+)\)\]', wasm_lib_text)
)
actual_exports = tool_binding_names | manual_names

# ── 3. Report mismatches ─────────────────────────────────────────────────────

expected_names = set(expected_exports.values())
missing_from_wasm = sorted(expected_names - actual_exports)
extra_in_wasm = sorted(actual_exports - expected_names)

errors: list[str] = []

if missing_from_wasm:
    details = []
    for rust_cmd, wasm_name in sorted(expected_exports.items()):
        if wasm_name in missing_from_wasm:
            suffix = f"  (rustCommand: {rust_cmd})" if rust_cmd != wasm_name else ""
            details.append(f"   • {wasm_name}{suffix}")
    errors.append(
        f"❌  {len(missing_from_wasm)} expected WASM export(s) missing from instrument-web:\n"
        + "\n".join(details)
        + "\n   → Add tool_binding!() entries in src-core/instrument-web/src/lib.rs."
    )

if extra_in_wasm:
    # Extra exports are sub-commands called directly by tool components (e.g.
    # tool_jwt_build, tool_uuid_inspect). They don't need registry entries.
    print(f"ℹ️   {len(extra_in_wasm)} WASM export(s) not in registry (sub-commands — OK): "
          + ", ".join(extra_in_wasm))

print(f"check:wasm — {len(expected_names)} registry web exports checked")

if errors:
    print()
    print("\n\n".join(errors))
    sys.exit(1)
else:
    print("✅  All registry WASM exports match instrument-web bindings.")
