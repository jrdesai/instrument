#!/usr/bin/env python3
"""Add ts_rs::TS, specta::Type, and #[ts(export)] to instrument-core serde types."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src-core/instrument-core/src"
SKIP = frozenset({"lib.rs"})


def ensure_imports(text: str) -> str:
    if "use ts_rs::TS" in text:
        return text
    m = re.search(r"(use serde::[^\n]+\n)", text)
    if not m:
        return text
    return text[: m.end()] + "use specta::Type;\nuse ts_rs::TS;\n" + text[m.end() :]


def bump_derive_line(line: str) -> str:
    if "ts_rs::TS" in line or "Serialize, Deserialize" not in line:
        return line
    # ApiKeyFormat: Debug, Clone, PartialEq, Eq, Serialize, Deserialize — no Copy
    return line.replace(
        "Serialize, Deserialize", "Serialize, Deserialize, TS, Type", 1
    )


def insert_ts_export(text: str) -> str:
    """After #[serde(...)] line(s), before pub struct/enum, add #[ts(export)] once."""

    def repl(m: re.Match[str]) -> str:
        block = m.group(1)
        if "#[ts(export)]" in block:
            return m.group(0)
        indent = ""
        publine = m.group(2)
        if publine.startswith(" "):
            indent = publine[: len(publine) - len(publine.lstrip())]
        return f"{block}{indent}#[ts(export)]\n{publine}"

    # Multiline serde attrs: #[serde(...)] possibly multiple lines
    return re.sub(
        r"((?:#\[[^\]]+\]\n)+)(pub (?:struct|enum) )",
        repl,
        text,
    )


def process_file(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if rel.name in SKIP or "to_typescript" in rel.name:
        return False
    text = path.read_text(encoding="utf-8")
    if "Serialize, Deserialize" not in text or "ts_rs::TS" in text:
        return False

    lines = [bump_derive_line(L) for L in text.splitlines(keepends=True)]
    text2 = "".join(lines)
    if text2 == text:
        return False

    text2 = ensure_imports(text2)
    text2 = insert_ts_export(text2)
    # Collapse duplicate ts(export)
    text2 = re.sub(r"(#\[ts\(export\)\]\n)+", "#[ts(export)]\n", text2)

    path.write_text(text2, encoding="utf-8")
    return True


def main() -> None:
    n = 0
    for path in sorted(ROOT.rglob("*.rs")):
        if process_file(path):
            print("updated", path.relative_to(ROOT.parent.parent))
            n += 1
    print(f"done, {n} files")


if __name__ == "__main__":
    main()
