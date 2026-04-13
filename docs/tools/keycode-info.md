# Keycode Info

Inspect keyboard events in the browser: `key`, `code`, legacy `keyCode` / `which` / `charCode`, `location`, `repeat`, modifiers, and (for single-character keys) Unicode code point and decimal value.

## How it works

Focus the capture area (it auto-focuses on load). Each `keydown` updates the panel and appends to a short history (pure modifier keys alone are not recorded). Click a history chip to restore that snapshot.

## Privacy

Runs entirely in the frontend; nothing is sent to Rust or over the network.

## Notes

- `preventDefault()` is used on every captured key so Space, Tab, etc. do not scroll or move focus—this is intentional for debugging shortcuts in this tool only.
