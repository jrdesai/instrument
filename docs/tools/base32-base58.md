# Base32 / Base58

**Category:** Encoding  |  **Roles:** Frontend, Backend, Data  |  **Platforms:** Desktop, Web

## What It Does

One tool encodes or decodes plain text using either **Base32** or **Base58**. **Base32** supports **RFC 4648** (standard alphabet with padding) and **Crockford** Base32. **Base58** uses the **Bitcoin** alphabet only (`bs58`). Text is treated as UTF-8 bytes on encode; decode output is UTF-8 text or an error if bytes are not valid UTF-8. The UI runs processing on a short debounce as you type; you can copy the result, clear both sides, and (for chains) pass structured input/output.

## Input Format

- **Encode:** Any UTF-8 string. The tool encodes the UTF-8 bytes of the input (no trimming on encode).
- **Decode:** A Base32 or Base58 string. Leading and trailing **whitespace is trimmed** before decoding. The string must be valid for the selected encoding and Base32 variant.

## Output Format

- **Success:** `result` holds the encoded or decoded text; `error` is null.
- **Failure:** `result` is empty; `error` holds a short message (invalid alphabet, decode failure, or non-UTF-8 decoded bytes).

## Options

| Option | Description |
|--------|-------------|
| **Encoding** | **Base32** or **Base58**. |
| **Mode** | **Encode** (text → encoded) or **Decode** (encoded → text). |
| **Variant** (Base32 only) | **Standard** — RFC 4648 with padding. **Crockford** — Crockford Base32 (no separate variant for Base58). |

## Examples

### Base32 standard encode

**Input:** `Hello`  
**Encoding:** Base32 · **Mode:** Encode · **Variant:** Standard  

**Output:** `JBSWY3DP`

### Base58 encode / decode

**Encode** arbitrary UTF-8 text to Base58; **decode** a Base58 string back to the same text when valid.

## Edge Cases

- **Empty or whitespace-only input:** No request; output is cleared.
- **Wrong variant on decode:** Standard vs Crockford must match the string that was produced on encode.
- **Base58:** Only the Bitcoin-style alphabet is supported; there is no Flickr / IPFS variant in this tool.

## Related Tools

- **Base64 Encoder** — Standard and URL-safe Base64.
- **Hex Converter** — Hex and text.
