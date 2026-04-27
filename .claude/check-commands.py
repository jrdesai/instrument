#!/usr/bin/env python3
"""
Validates that every implemented tool's rustCommand in the registry
has a corresponding #[tauri::command] function in the desktop commands.

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

# ── 3. Report mismatches ─────────────────────────────────────────────────────

missing = sorted(rust_commands - desktop_fns)
ok = sorted(rust_commands & desktop_fns)

print(f"check:commands — {len(ok)} commands validated")

if missing:
    print(f"\n❌  {len(missing)} rustCommand(s) have no matching desktop function:\n")
    for cmd in missing:
        print(f"   • {cmd}")
    print(
        "\nEach rustCommand in src/registry/index.ts must have a matching "
        "#[tauri::command] pub fn in src-core/instrument-desktop/src/commands/."
    )
    sys.exit(1)
else:
    print("✅  All registry rustCommands match desktop command functions.")
