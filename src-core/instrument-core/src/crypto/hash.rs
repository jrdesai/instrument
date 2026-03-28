//! Combined hash tool: MD5, SHA-1, SHA-256, SHA-512, SHA3-256, SHA3-512.
//! Supports Hex, Base64, Base64url output and optional HMAC mode.

use base64::{engine::general_purpose, Engine as _};
use digest::Digest;
use hmac::{Hmac, Mac};
use md5::Md5;
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use sha2::{Sha256, Sha512};
use sha3::{Sha3_256, Sha3_512};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, Type, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum HashOutputFormat {
    Hex,
    Base64,
    Base64url,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HashInput {
    /// Text to hash (UTF-8).
    pub text: String,
    /// If true, empty/whitespace-only input is hashed; otherwise all results are empty.
    pub hash_empty: bool,
    /// Output encoding for all algorithms.
    pub output_format: HashOutputFormat,
    /// If true and format is Hex, return uppercase hex. Ignored for Base64/Base64url.
    pub uppercase: bool,
    /// Optional HMAC secret key. When non-empty, all algorithms run as HMAC-<algo>.
    pub hmac_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HashResult {
    /// Algorithm name, e.g. "MD5", "SHA-256".
    pub algorithm: String,
    /// Hash or HMAC output in the requested encoding.
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HashOutput {
    pub results: Vec<HashResult>,
    pub error: Option<String>,
}

pub fn process(input: HashInput) -> HashOutput {
    if input.text.trim().is_empty() && !input.hash_empty {
        return HashOutput {
            results: empty_results(),
            error: None,
        };
    }

    let text = input.text.as_bytes();
    let key = input.hmac_key.as_bytes();
    let use_hmac = !input.hmac_key.is_empty();

    macro_rules! hash_or_hmac {
        ($algo:expr, $hasher:ty, $hmac:ty) => {{
            let bytes: Vec<u8> = if use_hmac {
                match <$hmac>::new_from_slice(key) {
                    Ok(mut mac) => {
                        mac.update(text);
                        mac.finalize().into_bytes().to_vec()
                    }
                    Err(e) => {
                        return HashOutput {
                            results: empty_results(),
                            error: Some(format!("HMAC key error: {e}")),
                        };
                    }
                }
            } else {
                <$hasher>::digest(text).to_vec()
            };
            HashResult {
                algorithm: $algo.to_string(),
                value: encode_output(&bytes, &input.output_format, input.uppercase),
            }
        }};
    }

    HashOutput {
        results: vec![
            hash_or_hmac!("MD5", Md5, Hmac<Md5>),
            hash_or_hmac!("SHA-1", Sha1, Hmac<Sha1>),
            hash_or_hmac!("SHA-256", Sha256, Hmac<Sha256>),
            hash_or_hmac!("SHA-512", Sha512, Hmac<Sha512>),
            hash_or_hmac!("SHA3-256", Sha3_256, Hmac<Sha3_256>),
            hash_or_hmac!("SHA3-512", Sha3_512, Hmac<Sha3_512>),
        ],
        error: None,
    }
}

fn encode_output(bytes: &[u8], format: &HashOutputFormat, uppercase: bool) -> String {
    match format {
        HashOutputFormat::Hex => {
            let hex: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
            if uppercase {
                hex.to_uppercase()
            } else {
                hex
            }
        }
        HashOutputFormat::Base64 => general_purpose::STANDARD.encode(bytes),
        HashOutputFormat::Base64url => general_purpose::URL_SAFE_NO_PAD.encode(bytes),
    }
}

fn empty_results() -> Vec<HashResult> {
    ["MD5", "SHA-1", "SHA-256", "SHA-512", "SHA3-256", "SHA3-512"]
        .iter()
        .map(|a| HashResult {
            algorithm: (*a).to_string(),
            value: String::new(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(text: &str) -> HashInput {
        HashInput {
            text: text.to_string(),
            hash_empty: false,
            output_format: HashOutputFormat::Hex,
            uppercase: false,
            hmac_key: String::new(),
        }
    }

    #[test]
    fn known_md5() {
        let out = process(input("hello"));
        assert_eq!(out.results[0].algorithm, "MD5");
        assert_eq!(out.results[0].value, "5d41402abc4b2a76b9719d911017c592");
    }

    #[test]
    fn known_sha256() {
        let out = process(input("hello"));
        let sha256 = out.results.iter().find(|r| r.algorithm == "SHA-256").unwrap();
        assert_eq!(
            sha256.value,
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }

    #[test]
    fn empty_input_not_hashed() {
        let out = process(input(""));
        assert!(out.results.iter().all(|r| r.value.is_empty()));
    }

    #[test]
    fn empty_input_opt_in() {
        let out = process(HashInput {
            hash_empty: true,
            ..input("")
        });
        assert!(out.results.iter().all(|r| !r.value.is_empty()));
    }

    #[test]
    fn uppercase_hex() {
        let out = process(HashInput {
            uppercase: true,
            ..input("hello")
        });
        assert!(out.results[0].value.chars().all(|c| !c.is_lowercase()));
    }

    #[test]
    fn base64_output() {
        let out = process(HashInput {
            output_format: HashOutputFormat::Base64,
            ..input("hello")
        });
        assert!(!out.results[2].value.is_empty());
    }

    #[test]
    fn hmac_sha256() {
        let out = process(HashInput {
            hmac_key: "secret".to_string(),
            ..input("hello")
        });
        let sha256 = out.results.iter().find(|r| r.algorithm == "SHA-256").unwrap();
        assert_eq!(
            sha256.value,
            "88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b"
        );
    }

    #[test]
    fn all_six_algorithms_present() {
        let out = process(input("test"));
        let names: Vec<&str> = out.results.iter().map(|r| r.algorithm.as_str()).collect();
        assert_eq!(
            names,
            ["MD5", "SHA-1", "SHA-256", "SHA-512", "SHA3-256", "SHA3-512"]
        );
    }
}
