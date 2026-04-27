//! Subresource Integrity (SRI) hash generator.
//! Accepts raw file bytes as standard base64, returns sha256/sha384/sha512
//! integrity attribute values (e.g. "sha384-<base64>").

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256, Sha384, Sha512};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SriInput {
    /// Raw file bytes encoded as standard base64.
    /// Frontend converts both file uploads (ArrayBuffer) and text (TextEncoder) to base64.
    pub content_b64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SriOutput {
    /// "sha256-<base64-encoded-hash>"
    pub sha256: String,
    /// "sha384-<base64-encoded-hash>"
    pub sha384: String,
    /// "sha512-<base64-encoded-hash>"
    pub sha512: String,
    pub error: Option<String>,
}

/// Generates SRI digest strings for SHA-256, SHA-384, and SHA-512.
pub fn process(input: SriInput) -> SriOutput {
    let bytes = match general_purpose::STANDARD.decode(&input.content_b64) {
        Ok(decoded) => decoded,
        Err(e) => {
            return SriOutput {
                sha256: String::new(),
                sha384: String::new(),
                sha512: String::new(),
                error: Some(format!("Failed to decode content: {e}")),
            };
        }
    };

    let sha256 = format!(
        "sha256-{}",
        general_purpose::STANDARD.encode(Sha256::digest(&bytes))
    );
    let sha384 = format!(
        "sha384-{}",
        general_purpose::STANDARD.encode(Sha384::digest(&bytes))
    );
    let sha512 = format!(
        "sha512-{}",
        general_purpose::STANDARD.encode(Sha512::digest(&bytes))
    );

    SriOutput {
        sha256,
        sha384,
        sha512,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn b64(s: &str) -> String {
        general_purpose::STANDARD.encode(s.as_bytes())
    }

    #[test]
    fn known_sha384() {
        // echo -n "hello" | openssl dgst -sha384 -binary | base64
        let out = process(SriInput {
            content_b64: b64("hello"),
        });
        assert!(out.error.is_none());
        assert!(out.sha384.starts_with("sha384-"));
        assert_eq!(
            out.sha384,
            "sha384-WeF0h3dEjGnea4ANejO7+5/xtGPkQ1TDVTvNucZm+pASWjx5+QOXvfX2oT3oKGhP"
        );
    }

    #[test]
    fn all_three_prefixes() {
        let out = process(SriInput {
            content_b64: b64("test"),
        });
        assert!(out.sha256.starts_with("sha256-"));
        assert!(out.sha384.starts_with("sha384-"));
        assert!(out.sha512.starts_with("sha512-"));
    }

    #[test]
    fn invalid_base64_returns_error() {
        let out = process(SriInput {
            content_b64: "!!!not-base64!!!".to_string(),
        });
        assert!(out.error.is_some());
        assert!(out.sha256.is_empty());
    }
}
