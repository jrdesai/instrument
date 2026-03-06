# Find & Replace

Find and replace text with optional regex. Supports case sensitivity, whole-word matching, and replace first or all.

## Use cases

- **Editors** — Bulk replace in pasted text (e.g. variable names, placeholders).
- **Logs** — Redact or anonymise (e.g. replace emails with `***`).
- **Data** — Normalise separators or patterns using regex (e.g. `\d+` → `NUM`).
- **Docs** — Fix repeated typos or formatting.

## Options

| Option | Description |
|--------|--------------|
| **Case sensitive** | Match exact casing (e.g. "Cat" ≠ "cat"). Off by default. |
| **Whole word** | Match only full words (e.g. "cat" not in "concatenate"). Plain-text mode only. |
| **Regex** | Treat **Find** as a regex pattern (Rust [regex](https://docs.rs/regex) syntax). Word boundaries are under your control. |
| **Replace all** | Replace every match. Off = replace only the first match. On by default. |

## Input / output

- **Find** — Literal string or regex pattern (see Regex mode).
- **Replace with** — Replacement string (literal; no capture-group expansion in the UI).
- **Input text** — The text to search in.
- **Output** — Result after replacement. Header shows match count and replacements made. Invalid regex shows an error in red.

## Regex mode

- **Find** is used as the regex pattern. Invalid patterns return a clear error and leave the text unchanged.
- Syntax follows the [Rust regex crate](https://docs.rs/regex/latest/regex/#syntax) (similar to but not identical to JavaScript regex).
- **Whole word** is ignored in regex mode; use `\b` in your pattern if needed (e.g. `\bcat\b`).
- **Case sensitive** still applies in regex mode.

## Examples

- Plain: Find `cat`, Replace `dog` → "the cat sat" → "the dog sat".
- Replace first: "cat and cat", Replace all off → "dog and cat".
- Case sensitive: Find `cat` in "Cat and cat" → only "cat" replaced.
- Whole word: Find `cat` in "cat concatenate" → only the first "cat" replaced.
- Regex: Find `\d+`, Replace `NUM` → "100 and 50" → "NUM and NUM".
- Invalid regex: Find `[invalid` with Regex on → error shown, text unchanged.
