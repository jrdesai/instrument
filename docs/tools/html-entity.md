# HTML Entity Encoder / Decoder

**Category:** Encoding  |  **Roles:** Frontend, General  |  **Platforms:** Desktop, Web

## What It Does

The HTML Entity tool encodes special characters as HTML entities (encode) or decodes HTML entities back to plain text (decode). You can choose **Named** entities (e.g. `&amp;`, `&lt;`, `&gt;`) or **Numeric** entities (e.g. `&#38;`, `&#60;`, `&#62;`). On decode, both named and numeric (decimal `&#38;` and hex `&#x26;`) are recognised; unknown entities like `&foo;` are left unchanged. The output panel shows how many entities were encoded or decoded when the count is greater than zero. Processing runs automatically with a short debounce; you can swap input and output (and mode), clear both panels, or copy the output.

## Input Format

- **Encode mode:** Any UTF-8 text. The tool replaces `&`, `<`, `>`, `"`, and `'` with the chosen entity form. All other characters are left as-is.
- **Decode mode:** Text containing HTML entities. Named entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`), decimal numeric (`&#38;`, `&#60;`, …), and hex numeric (`&#x26;`, `&#x3c;`, …) are decoded. Unknown entities (e.g. `&foo;`) are left as-is; no error is returned.

Input is sent as a single string; the UI shows **Lines** and **Chars** for the current input.

## Output Format

- **Success:** The output panel shows the encoded or decoded string. The backend returns:
  - **result** — The encoded or decoded text.
  - **entitiesFound** — Number of entities encoded (encode) or decoded (decode). Shown in the output panel header when &gt; 0 (e.g. "3 entities encoded", "2 entities decoded").
  - **error** — Omitted when successful.
- **Error:** The tool does not return an error for invalid or unknown entities on decode; unknown entities are left as-is. If the backend returns an error for any other reason, the panel shows it in red.

## Options

| Option | Description |
|--------|-------------|
| **Encode / Decode** | Switch between encoding (text → entities) and decoding (entities → text). Swap also flips this mode. |
| **Named** | Encode to named entities: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&apos;`. |
| **Numeric** | Encode to decimal numeric entities: `&` → `&#38;`, `<` → `&#60;`, `>` → `&#62;`, `"` → `&#34;`, `'` → `&#39;`. |

## Examples

### 1. Encode named

**Input (Encode, Named):**  
`<script>`

**Output:**  
`&lt;script&gt;`  
Header: "2 entities encoded".

---

### 2. Encode numeric

**Input (Encode, Numeric):**  
`a & b`

**Output:**  
`a &#38; b`  
Header: "1 entity encoded".

---

### 3. Decode named

**Input (Decode):**  
`&lt;div&gt;`

**Output:**  
`<div>`  
Header: "2 entities decoded".

---

### 4. Decode numeric (decimal and hex)

**Input (Decode):**  
`&#60;x&#62;` or `&#x3c;x&#x3e;`

**Output:**  
`<x>`  
Header: "2 entities decoded".

---

### 5. Unknown entity left as-is

**Input (Decode):**  
`&foo; bar`

**Output:**  
`&foo; bar`  
Header: "Output" (0 entities decoded). The unknown `&foo;` is not changed.

## Edge Cases

- **Empty input:** Output is cleared; no error. No request is sent. **entitiesFound** is 0.
- **Unknown entities (Decode):** Entities that are not one of the known named or numeric forms (e.g. `&foo;`, `&bar;`) are left in the output unchanged. No error is returned.
- **Invalid numeric (Decode):** Malformed numeric entities (e.g. `&#;` with no digits) are left as-is. Invalid Unicode code points from numeric entities may be replaced or left as-is depending on implementation; the tool aims to leave invalid sequences unchanged where possible.
- **Apostrophe:** Named encoding uses `&apos;` (valid in XML). Numeric encoding uses `&#39;` (recommended for HTML5 where `&apos;` is not defined).

## Related Tools

- **Base64 Encoder** — Encode or decode Base64.
- **URL Encoder** — Encode or decode URL percent-encoding.
- **Hex Converter** — Convert between hex, bytes, and text.

All are in the **Encoding** category; HTML Entity is available on Desktop and Web.
