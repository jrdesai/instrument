# Hex Converter

**Category:** Encoding  |  **Roles:** Frontend, Backend, General  |  **Platforms:** Desktop, Web

## What It Does

The Hex Converter tool converts between UTF-8 text and its hexadecimal byte representation. In **Text→Hex** mode it encodes each UTF-8 byte of the input string as lowercase hex, with a configurable separator between bytes. In **Hex→Text** mode it parses a series of hex bytes (with or without separators) back into text. The tool validates hex input carefully and reports clear errors for invalid characters, odd-length input, or non‑UTF‑8 bytes. Processing runs automatically with a short debounce as you type; you can swap input and output (and mode), clear both panels, or copy the output.

## Input Format

- **Text→Hex mode:** Any UTF-8 text. The string is converted to bytes and then formatted as hex using the selected separator. For example, `"Hello"` with **Space** separator becomes `48 65 6c 6c 6f`.
- **Hex→Text mode:** A sequence of hex byte values. The tool:
  - Strips **all** whitespace, colons (`:`), and dashes (`-`) before parsing.
  - Expects an **even** number of remaining hex characters (two per byte).
  - Requires every character to be a valid hex digit (`0-9`, `a-f`, `A-F`).
  - Interprets each pair of hex digits as a byte and then decodes the bytes as UTF‑8.

Input is sent as a single string; the UI shows **Lines** and **Chars** for the current input.

## Output Format

- **Success:** The output panel shows the encoded or decoded string. The backend returns:
  - **result** — The encoded hex string or decoded text.
  - **byteCount** — Number of bytes processed (original text bytes in Text→Hex, decoded bytes in Hex→Text). Shown in the output header as e.g. `"5 bytes"`.
  - **error** — Omitted when successful.
- **Error:** For invalid hex input the tool returns an error message and an empty result. Examples:
  - Odd-length hex string after stripping separators.
  - Invalid hex character (e.g. `z`).
  - Decoded bytes that are not valid UTF‑8.

The UI displays errors in red in the output panel.

## Options

| Option | Description |
|--------|-------------|
| **Text→Hex / Hex→Text** | Conversion direction. Text→Hex encodes text into hex; Hex→Text decodes hex back into text. Swap also flips this mode. |
| **Separator** | When in Text→Hex, controls how hex bytes are separated. Disabled in Hex→Text mode. Options: **None** (`48656c6c6f`), **Space** (`48 65 6c 6c 6f`), **Colon** (`48:65:6c:6c:6f`), **Dash** (`48-65-6c-6c-6f`). |

## Examples

### 1. Text→Hex (no separator)

**Input (Text→Hex, None):**  
`Hello`

**Output:**  
`48656c6c6f`  
Header: `5 bytes`.

---

### 2. Text→Hex (Space, Colon, Dash)

**Input (Text→Hex, Space):**  
`Hello` → `48 65 6c 6c 6f`

**Input (Text→Hex, Colon):**  
`Hello` → `48:65:6c:6c:6f`

**Input (Text→Hex, Dash):**  
`Hello` → `48-65-6c-6c-6f`

---

### 3. Hex→Text (compact)

**Input (Hex→Text):**  
`48656c6c6f`

**Output:**  
`Hello`  
Header: `5 bytes`.

---

### 4. Hex→Text with spaces

**Input (Hex→Text):**  
`48 65 6c 6c 6f`

**Output:**  
`Hello`

Whitespace is ignored before parsing.

---

### 5. Invalid hex character

**Input (Hex→Text):**  
`48 65 6c 6c 6z`

**Output:**  
Error message mentioning the invalid character `z` and its position; result is empty.

---

### 6. Odd-length hex string

**Input (Hex→Text):**  
`48 65 6c 6c 6`

**Output:**  
Error message explaining that the hex string has an odd number of characters after stripping separators; result is empty.

---

### 7. Round-trip

**Step 1 (Text→Hex, Space):**  
`Hello` → `48 65 6c 6c 6f`

**Step 2 (Hex→Text):**  
`48 65 6c 6c 6f` → `Hello`

## Edge Cases

- **Empty input:** Output is cleared; no error. No request is sent. `byteCount` is 0.
- **Whitespace and separators:** In Hex→Text mode, all whitespace, colons, and dashes are stripped before parsing. This means inputs like `48:65-6c 6c 6f` are accepted as valid.
- **Invalid characters:** Any non-hex character in the cleaned string causes an error that identifies the offending character and its position.
- **Odd length:** An odd number of hex digits after stripping separators is rejected with a clear error message.
- **Non‑UTF‑8 bytes:** If the decoded byte sequence is not valid UTF‑8, the tool returns an error such as *“Decoded bytes are not valid UTF-8. Input may contain binary data.”* and an empty result.

## Related Tools

- **Base64 Encoder** — Encode or decode Base64.
- **URL Encoder** — Encode or decode URL percent-encoding.
- **HTML Entity** — Encode or decode HTML entities.

All are in the **Encoding** category and available on Desktop and Web.

