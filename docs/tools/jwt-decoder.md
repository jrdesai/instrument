# JWT Decoder

Decode and inspect JSON Web Tokens (JWTs) in the Instrument app.

## What is a JWT?

A JWT is a compact, URL-safe token that consists of **three parts** separated by dots (`.`):

1. **Header** — Base64url-encoded JSON describing the token type and signing algorithm (e.g. `HS256`, `RS256`).
2. **Payload** — Base64url-encoded JSON containing claims (e.g. `sub`, `iss`, `exp`, custom data).
3. **Signature** — Base64url-encoded bytes used to verify that the token was not tampered with (for signed JWTs).

The tool decodes the header and payload into readable JSON and, when a secret is provided, can verify HMAC-based signatures (HS256, HS384, HS512).

## How to use the tool

1. Paste a JWT token into the text area at the top. The tool auto-processes as you type (debounced).
2. View the **Header** section for algorithm, type, and optional key ID, plus the raw header JSON.
3. View the **Payload** section for standard claims (subject, issuer, audience, issued/expiry times) and the full claims as pretty JSON.
4. Optionally enter a **secret** in the Signature section and choose its encoding (UTF-8, Base64, or Hex) to verify the signature. The result is shown as Valid, Invalid, or Unverified.

Use **Copy Token** or **Copy Payload** to copy the raw token or the pretty-printed payload JSON. Use **Clear** to reset.

## Signature verification

- **HMAC (HS256, HS384, HS512):** Supported. Enter the shared secret and, if needed, set the correct encoding. The tool computes the HMAC and compares it to the token’s signature.
- **Asymmetric (RS256, ES256, etc.):** Verification is **not supported** in this tool. The UI will show that verification is not available for asymmetric algorithms. Use a dedicated library or service for RSA/ECDSA verification.
- **No secret:** If you leave the secret empty, the token is still decoded and the signature status is shown as “Unverified”.

## Note on asymmetric algorithms

Tokens signed with RS256, ES256, or other asymmetric algorithms require the **public key** (or certificate) to verify the signature. This tool only supports HMAC verification with a shared secret. For RS/ES tokens, decode and inspect claims here, and use another tool or code for signature verification.
