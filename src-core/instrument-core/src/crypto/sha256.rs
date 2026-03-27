//! SHA-256 hash using the `sha2` crate.
//!
//! Cryptographically strong; suitable for checksums, data integrity, and signatures.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use sha2::{Digest, Sha256};

/// Input for the SHA-256 Hash tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Sha256Input {
    /// Text to hash (UTF-8).
    pub text: String,
    /// If true, return hash in uppercase hex (A–F); otherwise lowercase (a–f).
    pub uppercase: bool,
    /// If true, empty or whitespace-only input is hashed; otherwise empty output is returned.
    pub hash_empty: bool,
}

/// Output of SHA-256 hashing.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Sha256Output {
    /// 64-character hex hash, or empty when input is empty and hash_empty is false.
    pub hash: String,
    /// 64 when a hash is returned, 0 when empty.
    pub length: usize,
    /// Set when hashing fails; normally None.
    pub error: Option<String>,
}

/// Compute SHA-256 hash of the input text.
///
/// When `text.trim()` is empty and `hash_empty` is false, returns empty hash and length 0.
/// When `hash_empty` is true, empty input returns the SHA-256 of the empty string.
pub fn process(input: Sha256Input) -> Sha256Output {
    if input.text.trim().is_empty() && !input.hash_empty {
        return Sha256Output {
            hash: String::new(),
            length: 0,
            error: None,
        };
    }
    let bytes = input.text.as_bytes();
    let digest = Sha256::digest(bytes);
    let mut hash = String::with_capacity(64);
    for b in digest.as_slice() {
        if input.uppercase {
            hash.push_str(&format!("{:02X}", b));
        } else {
            hash.push_str(&format!("{:02x}", b));
        }
    }
    Sha256Output {
        hash,
        length: 64,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_hash() {
        let out = process(Sha256Input {
            text: "hello".to_string(),
            uppercase: false,
            hash_empty: false,
        });
        assert!(out.error.is_none());
        assert_eq!(
            out.hash,
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
        assert_eq!(out.length, 64);
    }

    #[test]
    fn uppercase() {
        let out = process(Sha256Input {
            text: "hello".to_string(),
            uppercase: true,
            hash_empty: false,
        });
        assert!(out.error.is_none());
        assert_eq!(
            out.hash,
            "2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824"
        );
        assert_eq!(out.length, 64);
    }

    #[test]
    fn empty_string_opt_in() {
        let out = process(Sha256Input {
            text: String::new(),
            uppercase: false,
            hash_empty: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash.len(), 64);
        assert_eq!(
            out.hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(out.length, 64);
    }

    #[test]
    fn empty_string_opt_out() {
        let out = process(Sha256Input {
            text: String::new(),
            uppercase: false,
            hash_empty: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash, "");
        assert_eq!(out.length, 0);
    }

    #[test]
    fn length_check() {
        let out = process(Sha256Input {
            text: "any input".to_string(),
            uppercase: false,
            hash_empty: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash.len(), 64);
        assert_eq!(out.length, 64);
    }
}
