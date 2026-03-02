# URL Encoder / Decoder

**Category:** Encoding  |  **Roles:** Frontend, Backend, General  |  **Platforms:** Desktop, Web

## What It Does

The URL Encoder tool percent-encodes text for use in URLs (encode) or decodes percent-encoded strings back to plain text (decode). You can choose **Full** encoding (encodes everything including `/`, `?`, `&`, `=`) or **Component** encoding (encodes special characters but preserves `/` for path segments, e.g. query values or path components). Processing runs automatically with a short debounce as you type; you can swap input and output (and mode), clear both panels, or copy the output.

## Input Format

- **Encode mode:** Any UTF-8 text. Paste or type in the input panel. The string is percent-encoded according to the selected type (Full or Component).
- **Decode mode:** A percent-encoded string (e.g. `hello%20world`). Leading and trailing whitespace is trimmed before decoding. The string must be valid percent-encoding and decode to valid UTF-8.

Input is sent as a single string; the UI shows **Lines** and **Chars** for the current input.

## Output Format

- **Success:** The output panel shows the encoded or decoded string. The backend returns:
  - **result** — The encoded or decoded text.
  - **error** — Omitted when successful.
- **Error:** If decoding fails (malformed percent-sequences or invalid UTF-8), the panel shows an error message in red and the result is empty. No exception is thrown; the error is returned in the payload.

## Options

| Option | Description |
|--------|-------------|
| **Encode / Decode** | Switch between encoding (text → percent-encoded) and decoding (percent-encoded → text). Swap also flips this mode. |
| **Full** | Encodes all non-alphanumeric characters, including `/`, `?`, `&`, `=`. Use when encoding a full URL or a string that must not contain any reserved characters. |
| **Component** | Encodes special characters but preserves `/`. Use for path segments or when you need to keep slashes (e.g. `path/segment?foo=bar` → slashes stay, `?` and `=` are encoded). |

## Examples

### 1. Component encode (preserves /)

**Input (Encode, Component):**  
`path/segment?foo=bar`

**Output:**  
Path slashes preserved; `?` and `=` percent-encoded (e.g. `path/segment%3Ffoo%3Dbar`).

---

### 2. Full encode

**Input (Encode, Full):**  
`a/b?c=1&d=2`

**Output:**  
`a%2Fb%3Fc%3D1%26d%3D2` (everything including `/`, `?`, `=`, `&` encoded).

---

### 3. Decode

**Input (Decode):**  
`hello%20world`

**Output:**  
`hello world`

Whitespace around the input is trimmed before decoding.

## Edge Cases

- **Empty input:** Output is cleared; no error. No request is sent.
- **Invalid percent-encoding (Decode):** Malformed sequences (e.g. `%2` alone or incomplete) may decode to unexpected bytes. If the decoded byte sequence is not valid UTF-8, the backend returns an error (e.g. *"Invalid percent-encoding or UTF-8: ..."*) and an empty result.
- **Whitespace:** Decode trims leading and trailing whitespace from the input. Encode does not trim; spaces are encoded (e.g. as `%20`).
- **Full vs Component:** When encoding, Full encodes `/` as `%2F`; Component leaves `/` as-is. When decoding, both modes produce the same result; the encode type only affects encoding.

## Related Tools

- **Base64 Encoder** — Encode or decode Base64 (standard or URL-safe).
- **HTML Entity** — Encode or decode HTML entities (e.g. `&amp;`, `&lt;`).
- **Hex Converter** — Convert between hex, bytes, and text.

All are in the **Encoding** category and available on Desktop and Web.
