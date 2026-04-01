# Markdown Editor

Split-pane Markdown editor with live preview. Runs entirely in the browser using `marked` and `highlight.js` (no Rust/WASM).

## Features

- GFM-style parsing, formatting toolbar, word count and reading time
- Syntax-highlighted fenced code blocks (GitHub / GitHub Dark themes follow app light/dark)
- View modes: split, editor-only, preview-only; optional word wrap on the editor
- Upload `.md`, download Markdown or a minimal standalone HTML export
- Scroll sync from editor to preview in split mode

## Privacy

All rendering is local. Preview HTML is not sanitized; use only with trusted Markdown sources.
