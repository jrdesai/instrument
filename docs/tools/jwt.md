# JWT

Decode and inspect JSON Web Tokens, or build and sign new ones with HMAC — in one tool with **Decode** and **Build** tabs.

## What is a JWT?

A JWT is a compact, URL-safe token of **three parts** separated by dots (`.`):

1. **Header** — Base64url-encoded JSON (type and algorithm, e.g. `HS256`, `RS256`).
2. **Payload** — Base64url-encoded JSON (claims such as `sub`, `iss`, `exp`, and custom data).
3. **Signature** — Base64url-encoded bytes that prove the token was not tampered with (for signed JWTs).

## Decode tab

Paste a JWT at the top; the tool processes input as you type (debounced). Open **Header**, **Payload**, and **Signature** sections to inspect details. Optionally enter a **secret** (UTF-8, Base64, or Hex) in the Signature section to verify HMAC signatures.

**Signature verification**

- **HMAC (HS256, HS384, HS512):** Supported with the shared secret and correct encoding.
- **Asymmetric (RS256, ES256, etc.):** Not supported here; the UI indicates asymmetric tokens cannot be verified with a shared secret. Use a library or service with the public key for verification.
- **No secret:** The token is still decoded; signature status is “Unverified”.

Use **Copy Token**, **Copy Payload**, and **Clear** as needed.

## Build tab

**Use cases:** local testing, integration tests, API exploration, prototyping, and learning how tokens are assembled.

**Warning:** For testing only. Do not use production secrets or rely on this for production issuance.

**Algorithms**

- **HS256, HS384, HS512:** Symmetric HMAC; use the same secret on the Decode tab to verify.
- **None:** Unsigned token (`alg: "none"`), trailing empty signature segment. Many runtimes reject `alg:none`; use only in controlled tests.

**Steps**

1. Choose algorithm (default HS256).
2. If not None, enter **secret** and encoding.
3. Optionally enable standard claims (sub, iss, aud, jti); use **Generate** for jti (UUID v4).
4. Toggle **Issued At (iat)** and **Expires In (exp)** with value and unit (minutes, hours, days).
5. Add **custom claims** as JSON (standard toggles override duplicate keys).
6. Optionally set **extra headers** (e.g. `kid`).
7. Click **Build JWT**; review token and JSON on the right.
8. **Open in Decoder** switches to the Decode tab and loads the built token. **Copy Token** and **Clear** are also available.

With **alg: none**, the token is `{header_b64}.{payload_b64}.` (empty third part). Treat as test-only where explicitly allowed.
