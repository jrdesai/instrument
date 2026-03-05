# String Escaper

Escape or unescape text for JSON, Regex, HTML, SQL, Shell, and CSV. One tool, six target formats.

## Use cases by target

| Target | Use case |
|--------|----------|
| **JSON** | Embed strings in JSON (quotes, newlines, backslashes). Parse JSON-style escape sequences. |
| **Regex** | Literal regex special chars (e.g. `1+1` → `1\+1`). Reverse for editing. |
| **HTML** | Sanitise for HTML (`<`, `>`, `"`, `'`, `&`). Decode entities. |
| **SQL** | Double single quotes for SQL string literals. **Note:** For full safety always use parameterised queries. |
| **Shell** | Single-quote wrap and internal quote escaping for shell commands. |
| **CSV** | Quote and escape fields containing comma, newline, or double quote. |

## Input / output

- **Input:** Plain text. Mode: **Escape** (plain → escaped) or **Unescape** (escaped → plain).
- **Output:** Escaped or unescaped string. A **changes** count is returned (number of replacements). Empty input → empty result, 0 changes, no error.

## Options

- **Mode:** Escape | Unescape.
- **Target:** JSON | Regex | HTML | SQL | Shell | CSV.

## Format rules

- **JSON:** Escape `"` `\` newline tab cr backspace form-feed and control chars (`\uXXXX`). Unescape the same; invalid sequences return an error.
- **Regex:** Escape `. * + ? ^ $ { } [ ] | ( ) \ / =`. Unescape by removing `\` before those.
- **HTML:** Named entities `&amp;` `&lt;` `&gt;` `&quot;` `&#39;` (apostrophe). Decode named and numeric (`&#123;` `&#x7b;`).
- **SQL:** Escape `'` → `''`. Unescape `''` → `'`.
- **Shell:** Wrap in single quotes; internal `'` → `'\''`. Unescape: remove outer quotes and `\'` → `'`.
- **CSV:** If input contains `,` newline or `"`, wrap in `"` and escape `"` as `""`. Unescape: remove outer quotes, `""` → `"`.

## SQL safety note

SQL escaping here only doubles single quotes. It does **not** protect against all injection. Prefer **parameterised queries** (bound parameters) for any user or external input.

## Examples

- **JSON:** `He said "hello\nworld"` (Escape) → `He said \"hello\\nworld\"` (4 changes).
- **Regex:** `1+1=2` (Escape) → `1\+1\=2`.
- **HTML:** `<script>alert("xss")</script>` (Escape) → `&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;`.
- **SQL:** `it's` (Escape) → `it''s`.
- **Shell:** `hello world` (Escape) → `'hello world'`.
- **CSV:** `hello, world` (Escape) → `"hello, world"`.

Use **Swap** to move the output into the input and flip mode (Escape ↔ Unescape) to round-trip.
