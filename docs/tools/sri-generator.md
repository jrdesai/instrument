# SRI Generator

Generate Subresource Integrity hashes for local assets.

## What it does

- Accepts file bytes or pasted text content
- Computes `sha256-`, `sha384-`, and `sha512-` integrity values
- Highlights SHA-384 as the default recommendation
- Provides ready-to-copy HTML snippets for `<script>` and `<link>` tags

## Privacy

- Runs fully local on desktop and web
- Content is never uploaded
- Tool calls use history skip to avoid storing large asset payloads
