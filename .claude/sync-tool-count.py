#!/usr/bin/env python3
"""
Auto-sync the implemented tool count across docs after src/registry/index.ts changes.
Called by the Claude Code PostToolUse hook — see .claude/settings.json.
"""
import re
import sys
import subprocess
import datetime
import pathlib

ROOT = pathlib.Path(__file__).parent.parent.resolve()
_project_key = str(ROOT).replace("/", "-").lstrip("-")
MEMORY = pathlib.Path.home() / ".claude/projects" / _project_key / "memory/project_current_state.md"
TODAY = datetime.date.today().isoformat()

# Count tools with implemented: true across all registry files
registry_dir = ROOT / "src/registry"
COUNT = sum(
    p.read_text(encoding="utf-8").count("implemented: true")
    for p in sorted(registry_dir.rglob("*.ts"))
)
if COUNT == 0:
    print("sync-tool-count: count is 0, skipping", file=sys.stderr)
    sys.exit(0)


def patch(path: pathlib.Path, *replacements: tuple[str, str]) -> None:
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)
    path.write_text(text, encoding="utf-8")


# README.md — two occurrences
patch(
    ROOT / "README.md",
    (r"— \d+ tools,", f"— {COUNT} tools,"),
    (r"## Tools \(\d+ total\)", f"## Tools ({COUNT} total)"),
)

# temp/tool-roadmap.md — summary row, verify comment (count + date)
patch(
    ROOT / "temp/tool-roadmap.md",
    (r"✅ Implemented \| \*\*\d+\*\* \|", f"✅ Implemented | **{COUNT}** |"),
    (r"→ \d+", f"→ {COUNT}"),
    (r"Last updated \d{4}-\d{2}-\d{2}", f"Last updated {TODAY}"),
)

# memory/project_current_state.md
patch(
    MEMORY,
    (r"\d+ tools implemented", f"{COUNT} tools implemented"),
)

print(f"sync-tool-count: {COUNT} tools ({TODAY})")
