# Base64 Encoder / Decoder

**Category:** Encoding  |  **Roles:** Frontend, Backend, Data  |  **Platforms:** Desktop, Web

## What It Does

The Base64 tool encodes plain text to Base64 or decodes Base64 back to text. It uses UTF-8 for text: on encode, the input string is converted to bytes (UTF-8), then to Base64; on decode, the Base64 bytes are decoded and interpreted as UTF-8. You can choose **standard** Base64 (with padding, `+`/`/`) or **URL-safe** Base64 (no padding, `-`/`_`). Processing runs automatically with a short debounce as you type; you can swap input and output (and mode), clear both panels, or copy the output.

## Input Format

- **Encode mode:** Any UTF-8 text. Paste or type in the input panel. Newlines and spaces are preserved; the tool encodes the string as-is (UTF-8 bytes → Base64).
- **Decode mode:** A Base64 string. Leading and trailing whitespace is trimmed before decoding. The string must be valid Base64 for the selected alphabet (standard or URL-safe).

Input is sent as a single string; the UI shows **Lines**, **Chars**, and **Bytes** (UTF-8 byte length) for the current input.

## Output Format

- **Success:** The output panel shows the encoded or decoded string. The backend returns:
  - **result** — The encoded or decoded text.
  - **byteCount** — Length in bytes (decoded bytes on decode; original bytes on encode).
  - **charCount** — Character count of the result (encode) or of the trimmed input (decode).
- **Error:** If decoding fails or decoded bytes are not valid UTF-8, the panel shows an error message in red and the result is empty. No exception is thrown; the error is returned in the payload.

## Options

| Option      | Description |
|------------|-------------|
| **Encode / Decode** | Switch between encoding (text → Base64) and decoding (Base64 → text). Swap also flips this mode. |
| **URL Safe**       | When on, uses the URL-safe alphabet (`URL_SAFE_NO_PAD`): no padding, `-` instead of `+`, `_` instead of `/`. When off, uses standard Base64 with padding. Decode input must match the alphabet you selected. |

## Examples

### 1. Standard encode

**Input (Encode, URL Safe off):**  
`Hello, World!`

**Output:**  
`SGVsbG8sIFdvcmxkIQ==`

Standard Base64 with `=` padding.

---

### 2. URL-safe encode

**Input (Encode, URL Safe on):**  
`hello`

**Output:**  
`aGVsbG8`

URL-safe alphabet, no padding (same as the Rust test: `"hello"` → `"aGVsbG8"`).

---

### 3. Decode

**Input (Decode, URL Safe off):**  
`aGVsbG8=`

**Output:**  
`hello`

Standard Base64 decode. Whitespace around the input is trimmed before decoding.

## Edge Cases

- **Empty input:** Output is cleared; no error. No request is sent.
- **Invalid Base64 (Decode):** The backend returns an error message (e.g. *"Invalid Base64: ... Check padding and alphabet (standard vs URL-safe)."*). The result string is empty and the UI shows the message in red.
- **Decoded bytes not UTF-8:** If the decoded bytes are not valid UTF-8, the backend returns the error *"Decoded bytes are not valid UTF-8"* and an empty result.
- **Whitespace:** Decode trims leading and trailing whitespace from the input string before decoding. Encode does not trim; spaces and newlines are encoded as-is.
- **Standard vs URL-safe:** When decoding, the input must match the chosen alphabet and padding. Standard uses `+`, `/`, and padding `=`; URL-safe uses `-`, `_`, and no padding. Mismatched alphabet or padding leads to an invalid Base64 error.

## Related Tools

- **URL Encoder** — Encode or decode URL percent-encoding (e.g. `%20` for space).
- **HTML Entity** — Encode or decode HTML entities (e.g. `&amp;`, `&lt;`).
- **Hex Converter** — Convert between hex, bytes, and text.

All are in the **Encoding** category and available on Desktop and Web.
