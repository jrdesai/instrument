# HTML Formatter

Pretty-prints HTML and common markup using the Rust [markup_fmt](https://crates.io/crates/markup_fmt) library. Parsing and printing run entirely on your device (native Rust on desktop, the same logic compiled to WebAssembly in the browser).

## Options

- **Indent** — Two spaces, four spaces, or tab-based indentation (tab stops use width 4 in the printer; tabs appear once wrapped lines need at least that much indent).
- **Wrap attributes** — When enabled, multiple attributes on one tag are split so each attribute tends to sit on its own line; **Print width** (40–200) feeds the formatter’s line-wrapping budget and matters most with wrapping on.
- **Print width** — Disabled (greyed out) when wrap attributes is off.

## Embedded script and style

Content inside `<script>` and `<style>` blocks is **not** reformatted: it is passed through unchanged. Only the surrounding HTML structure is pretty-printed.
