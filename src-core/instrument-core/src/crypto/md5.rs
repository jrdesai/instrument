//! MD5 hash using the `md-5` crate.
//!
//! One-way hashing only. Suitable for checksums and non-security use.
//! See [RFC 1321](https://www.rfc-editor.org/rfc/rfc1321).

use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the MD5 Hash tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Md5Input {
    /// Text to hash (UTF-8). Empty string is valid and returns the MD5 of empty input.
    pub text: String,
    /// If true, return hash in uppercase hex (A–F); otherwise lowercase (a–f).
    pub uppercase: bool,
}

/// Output of MD5 hashing.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Md5Output {
    /// 32-character hex hash.
    pub hash: String,
    /// Always 32 for MD5.
    pub length: u32,
    /// Set when hashing fails (e.g. invalid UTF-8); normally None.
    pub error: Option<String>,
}

/// Compute MD5 hash of the input text.
///
/// Empty input is valid and returns the MD5 of the empty string
/// (`d41d8cd98f00b204e9800998ecf8427e` in lowercase).
///
/// # Example
///
/// ```
/// use instrument_core::crypto::md5::{process, Md5Input};
///
/// let out = process(Md5Input {
///     text: "hello".to_string(),
///     uppercase: false,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.hash, "5d41402abc4b2a76b9719d911017c592");
/// assert_eq!(out.length, 32);
/// ```
pub fn process(input: Md5Input) -> Md5Output {
    let bytes = input.text.as_bytes();
    let digest = Md5::digest(bytes);
    let mut hash = String::with_capacity(32);
    for b in digest.as_slice() {
        if input.uppercase {
            hash.push_str(&format!("{:02X}", b));
        } else {
            hash.push_str(&format!("{:02x}", b));
        }
    }
    Md5Output {
        hash,
        length: 32,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_hash() {
        let out = process(Md5Input {
            text: "hello".to_string(),
            uppercase: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash, "5d41402abc4b2a76b9719d911017c592");
        assert_eq!(out.length, 32);
    }

    #[test]
    fn uppercase() {
        let out = process(Md5Input {
            text: "hello".to_string(),
            uppercase: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash, "5D41402ABC4B2A76B9719D911017C592");
        assert_eq!(out.length, 32);
    }

    #[test]
    fn empty_string() {
        let out = process(Md5Input {
            text: String::new(),
            uppercase: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash, "d41d8cd98f00b204e9800998ecf8427e");
        assert_eq!(out.length, 32);
    }

    #[test]
    fn long_input() {
        let s = "x".repeat(1000);
        let out = process(Md5Input {
            text: s,
            uppercase: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.hash.len(), 32);
        assert_eq!(out.length, 32);
    }
}
