# JWT Builder

Build and sign JSON Web Tokens (JWTs) in Instrument.

## Use cases

- **Testing:** Generate JWTs for local development, integration tests, or API exploration.
- **Prototyping:** Quickly create tokens with standard claims (sub, iss, aud, jti) and custom claims.
- **Learning:** Inspect how header, payload, and signature are combined.

## Warning

**For testing only.** Do not use this tool in production with real secrets. The token is built in the frontend and sent to the Rust backend for signing; use dedicated, secure tooling for production token issuance.

## Algorithm options

- **HS256, HS384, HS512:** Symmetric HMAC signing. You provide a secret; the same secret is used to verify in the JWT Decoder.
- **None:** Produces an unsigned token (`alg: "none"`). The token ends with a trailing dot (empty signature). Some runtimes reject `alg:none` tokens for security reasons; use only in controlled test environments.

## How to use

1. Choose an **algorithm** (default: HS256).
2. If not None, enter the **secret** and its encoding (UTF-8, Base64, or Hex).
3. Optionally enable **standard claims** (Subject, Issuer, Audience, JWT ID) and fill their values. Use **Generate** for JWT ID to insert a UUID v4.
4. Toggle **Issued At (iat)** and **Expires In (exp)** to add time claims. For exp, set the value and unit (minutes, hours, days).
5. Add **custom claims** as JSON in the text area. Standard claims take precedence over keys with the same name in the custom JSON.
6. Optionally add **extra headers** (e.g. `kid`) in the collapsible section.
7. Click **Build JWT**. The token and decoded header/payload appear on the right.
8. Use **Copy Token**, **Open in Decoder**, or **Clear** as needed.

## Explanation of alg:none

With **Algorithm: None**, the header contains `"alg": "none"` and no signature is computed. The token is `{header_b64}.{payload_b64}.` (empty third part). Many JWT libraries and services reject such tokens to prevent confusion with unsigned or stripped signatures. Use only where explicitly allowed (e.g. some tests or demos).
