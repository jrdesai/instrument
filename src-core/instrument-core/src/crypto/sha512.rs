//! SHA-512 hash using the `sha2` crate.
//!
//! Cryptographically strong; 512-bit output. Preferred for high-security
//! applications and where collision resistance is critical.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use sha2::{Digest, Sha512};

/// Input for the SHA-512 Hash tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Sha512Input {
    /// Text to hash (UTF-8).
    pub text: String,
    /// If true, return hash in uppercase hex (A–F); otherwise lowercase (a–f).
    pub uppercase: bool,
    /// If true, empty or whitespace-only input is hashed; otherwise empty output is returned.
    pub hash_empty: bool,
}

/// Output of SHA-512 hashing.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Sha512Output {
    /// 128-character hex hash, or empty when input is empty and hash_empty is false.
    pub hash: String,
    /// 128 when a hash is returned, 0 when empty.
    pub length: u32,
    /// Set when hashing fails; normally None.
    pub error: Option<String>,
}

/// Compute SHA-512 hash of the input text.
///
/// When `text.trim()` is empty and `hash_empty` is false, returns empty hash and length 0.
/// When `hash_empty` is true, empty input returns the SHA-512 of the empty string.
pub fn process(input: Sha512Input) -> Sha512Output {
    if input.text.trim().is_empty() && !input.hash_empty {
        return Sha512Output {
            hash: String::new(),
            length: 0,
            error: None,
        };
    }
    let bytes = input.text.as_bytes();
    let digest = Sha512::digest(bytes);
    let mut hash = String::with_capacity(128);
    for b in digest.as_slice() {
        if input.uppercase {
            hash.push_str(&format!("{:02X}", b));
        } else {
            hash.push_str(&format!("{:02x}", b));
        }
    }
    Sha512Output {
        hash,
        length: 128,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_hash() {
        let out = process(Sha512Input {
            text: "hello".to_string(),
            uppercase: false,
            hash_empty: false,
        });
        assert!(out.error.is_none());
        assert_eq!(
            out.hash,
            "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043"
        );
        assert_eq!(out.length, 128);
    }

    #[test]
    fn uppercase() {
        let out = process(Sha512Input {
            text: "hello".to_string(),
            uppercase: true,
            hash_empty: false,
        });
        assert!(out.error.is_none());
        assert_eq!(
            out.hash,
            "9B71D224BD62F3785D96D46AD3EA3D73319BFBC2890CAADAE2DFF72519673CA72323C3D99BA5C11D7C7ACC6E14B8C5DA0C4663475C2E5C3ADEF46F73BCDEC043"
        );
        assert_eq!(out.length, 128);
    }

    #[test]
    fn empty_string_opt_in() {
        let out = process(Sha512Input {
            text: String::new(),
            uppercase: false,
            hash_empty: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash.len(), 128);
        assert_eq!(
            out.hash,
            "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"
        );
        assert_eq!(out.length, 128);
    }

    #[test]
    fn empty_string_opt_out() {
        let out = process(Sha512Input {
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
        let out = process(Sha512Input {
            text: "any input".to_string(),
            uppercase: false,
            hash_empty: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash.len(), 128);
        assert_eq!(out.length, 128);
    }
}
