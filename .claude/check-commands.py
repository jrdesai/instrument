#!/usr/bin/env python3
"""
Validates that every implemented tool's rustCommand in the registry:
  1. Has a corresponding #[tauri::command] function in the desktop commands.
  2. Is registered in collect_commands![] in src-tauri/src/lib.rs.

Usage: python3 .claude/check-commands.py
Exit code 1 if any mismatches found.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent.parent.resolve()

# ── 1. Extract rustCommand values from the registry ──────────────────────────

registry_path = ROOT / "src/registry/index.ts"
registry_text = registry_path.read_text()

# Match rustCommand values only inside blocks that also have implemented: true
blocks = re.split(r"\{\s*id:", registry_text)
rust_commands: set[str] = set()

for block in blocks[1:]:  # skip preamble
    if "implemented: true" not in block:
        continue
    m = re.search(r'rustCommand:\s*["\']([^"\']+)["\']', block)
    if m:
        rust_commands.add(m.group(1))

# ── 2. Extract pub fn names from desktop command files ───────────────────────

commands_dir = ROOT / "src-core/instrument-desktop/src/commands"
desktop_fns: set[str] = set()

for rs_file in commands_dir.glob("*.rs"):
    text = rs_file.read_text()
    matches = re.findall(
        r"#\[tauri::command\][^\n]*\n(?:#\[specta::specta\][^\n]*\n)?pub fn (\w+)",
        text,
    )
    desktop_fns.update(matches)

# ── 3. Extract registered names from collect_commands![] in lib.rs ───────────

lib_rs_path = ROOT / "src-tauri/src/lib.rs"
lib_rs_text = lib_rs_path.read_text()

# Entries look like: instrument_desktop::commands::<module>::<fn_name>,
registered_fns: set[str] = set(
    re.findall(r"instrument_desktop::commands::\w+::(\w+)", lib_rs_text)
)

# ── 4. Report mismatches ─────────────────────────────────────────────────────

errors: list[str] = []

missing_desktop = sorted(rust_commands - desktop_fns)
if missing_desktop:
    errors.append(
        f"❌  {len(missing_desktop)} rustCommand(s) missing a desktop #[tauri::command] fn:\n"
        + "\n".join(f"   • {c}" for c in missing_desktop)
        + "\n   → Add a matching pub fn in src-core/instrument-desktop/src/commands/."
    )

missing_registered = sorted(rust_commands - registered_fns)
if missing_registered:
    errors.append(
        f"❌  {len(missing_registered)} rustCommand(s) not registered in collect_commands![]:\n"
        + "\n".join(f"   • {c}" for c in missing_registered)
        + "\n   → Add the entry to collect_commands![] in src-tauri/src/lib.rs."
    )

ok_count = len(rust_commands - set(missing_desktop) - set(missing_registered))
print(f"check:commands — {len(rust_commands)} registry commands checked")

if errors:
    print()
    print("\n\n".join(errors))
    sys.exit(1)
else:
    print("✅  All registry rustCommands have matching desktop fns and are registered.")
