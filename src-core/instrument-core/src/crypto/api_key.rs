//! API key generation using the `rand` crate.
//!
//! Supports multiple formats (raw, grouped, prefixed) and charsets.

use rand::{distributions::Uniform, Rng};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Output string format for an API key.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ApiKeyFormat {
    Raw,
    Grouped,
    Prefixed,
}

/// Character set used for API key generation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ApiKeyCharset {
    Alphanumeric,
    AlphaOnly,
    HexOnly,
    UrlSafe,
}

/// Input for the API Key Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyInput {
    pub count: usize,
    pub length: usize,
    pub prefix: String,
    pub format: ApiKeyFormat,
    pub charset: ApiKeyCharset,
}

/// Output from the API Key Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyOutput {
    pub keys: Vec<String>,
    pub error: Option<String>,
}

fn validate(input: &ApiKeyInput) -> Option<String> {
    if input.count == 0 || input.count > 100 {
        return Some("count must be between 1 and 100".to_string());
    }
    if input.length < 8 {
        return Some("length must be at least 8".to_string());
    }
    if input.length > 256 {
        return Some("length must be at most 256".to_string());
    }
    if input.prefix.chars().count() > 32 {
        return Some("prefix must be at most 32 characters".to_string());
    }
    None
}

fn charset_chars(charset: &ApiKeyCharset) -> &'static [u8] {
    match charset {
        ApiKeyCharset::Alphanumeric => b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        ApiKeyCharset::AlphaOnly => b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
        ApiKeyCharset::HexOnly => b"0123456789abcdef",
        ApiKeyCharset::UrlSafe => b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_",
    }
}

fn generate_raw_key(length: usize, charset: &ApiKeyCharset) -> String {
    let chars = charset_chars(charset);
    let mut rng = rand::thread_rng();
    let dist = Uniform::from(0..chars.len());
    let mut s = String::with_capacity(length);
    for _ in 0..length {
        let idx = rng.sample(dist);
        s.push(chars[idx] as char);
    }
    s
}

/// Generate API keys according to the input spec.
///
/// Count must be between 1 and 100; length between 8 and 256; prefix at most
/// 32 characters. Grouped format uses groups of 4 characters joined with `-`.
pub fn process(input: ApiKeyInput) -> ApiKeyOutput {
    if let Some(err) = validate(&input) {
        return ApiKeyOutput {
            keys: Vec::new(),
            error: Some(err),
        };
    }

    let mut keys = Vec::with_capacity(input.count);

    // Effective length for the raw key portion.
    let base_len = if input.format == ApiKeyFormat::Grouped {
        if input.length % 4 == 0 {
            input.length
        } else {
            ((input.length + 3) / 4) * 4
        }
    } else {
        input.length
    };

    for _ in 0..input.count {
        let mut body = generate_raw_key(base_len, &input.charset);

        if input.format == ApiKeyFormat::Grouped {
            let mut grouped = String::new();
            for (i, chunk) in body.as_bytes().chunks(4).enumerate() {
                if i > 0 {
                    grouped.push('-');
                }
                grouped.push_str(std::str::from_utf8(chunk).unwrap());
            }
            body = grouped;
        }

        if input.format == ApiKeyFormat::Prefixed && !input.prefix.is_empty() {
            let mut full = String::with_capacity(input.prefix.len() + body.len());
            full.push_str(&input.prefix);
            full.push_str(&body);
            body = full;
        }

        keys.push(body);
    }

    ApiKeyOutput { keys, error: None }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn is_hex(s: &str) -> bool {
        s.chars()
            .all(|c| matches!(c, '0'..='9' | 'a'..='f' | 'A'..='F'))
    }

    #[test]
    fn generates_one() {
        let out = process(ApiKeyInput {
            count: 1,
            length: 32,
            prefix: String::new(),
            format: ApiKeyFormat::Raw,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_none());
        assert_eq!(out.keys.len(), 1);
        assert_eq!(out.keys[0].len(), 32);
    }

    #[test]
    fn generates_multiple() {
        let out = process(ApiKeyInput {
            count: 5,
            length: 16,
            prefix: String::new(),
            format: ApiKeyFormat::Raw,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_none());
        assert_eq!(out.keys.len(), 5);
    }

    #[test]
    fn all_unique() {
        let out = process(ApiKeyInput {
            count: 20,
            length: 16,
            prefix: String::new(),
            format: ApiKeyFormat::Raw,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_none());
        let set: HashSet<_> = out.keys.iter().collect();
        assert_eq!(set.len(), 20);
    }

    #[test]
    fn with_prefix() {
        let prefix = "sk_live_".to_string();
        let out = process(ApiKeyInput {
            count: 3,
            length: 16,
            prefix: prefix.clone(),
            format: ApiKeyFormat::Prefixed,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_none());
        assert_eq!(out.keys.len(), 3);
        assert!(out.keys.iter().all(|k| k.starts_with(&prefix)));
    }

    #[test]
    fn with_prefix_applied() {
        let prefix = "sk_live_".to_string();
        let out = process(ApiKeyInput {
            count: 1,
            length: 32,
            prefix: prefix.clone(),
            format: ApiKeyFormat::Prefixed,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_none());
        assert_eq!(out.keys.len(), 1);
        let key = &out.keys[0];
        assert!(key.starts_with(&prefix));
        // 8-char prefix + 32 random characters
        assert_eq!(key.len(), 40);
    }

    #[test]
    fn empty_prefix_prefixed_format() {
        let out = process(ApiKeyInput {
            count: 1,
            length: 32,
            prefix: String::new(),
            format: ApiKeyFormat::Prefixed,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_none());
        assert_eq!(out.keys.len(), 1);
        let key = &out.keys[0];
        // No prefix, just the random portion
        assert_eq!(key.len(), 32);
    }

    #[test]
    fn grouped_format() {
        let out = process(ApiKeyInput {
            count: 1,
            length: 16,
            prefix: String::new(),
            format: ApiKeyFormat::Grouped,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_none());
        let key = &out.keys[0];
        let parts: Vec<_> = key.split('-').collect();
        assert_eq!(parts.len(), 4);
        assert!(parts.iter().all(|p| p.len() == 4));
    }

    #[test]
    fn hex_charset() {
        let out = process(ApiKeyInput {
            count: 1,
            length: 32,
            prefix: String::new(),
            format: ApiKeyFormat::Raw,
            charset: ApiKeyCharset::HexOnly,
        });
        assert!(out.error.is_none());
        let key = &out.keys[0];
        assert!(is_hex(key));
    }

    #[test]
    fn length_too_short() {
        let out = process(ApiKeyInput {
            count: 1,
            length: 7,
            prefix: String::new(),
            format: ApiKeyFormat::Raw,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_some());
        assert!(out.keys.is_empty());
    }

    #[test]
    fn length_too_long() {
        let out = process(ApiKeyInput {
            count: 1,
            length: 257,
            prefix: String::new(),
            format: ApiKeyFormat::Raw,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_some());
        assert!(out.keys.is_empty());
    }

    #[test]
    fn count_too_high() {
        let out = process(ApiKeyInput {
            count: 101,
            length: 16,
            prefix: String::new(),
            format: ApiKeyFormat::Raw,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_some());
        assert!(out.keys.is_empty());
    }

    #[test]
    fn prefix_too_long() {
        let long_prefix = "x".repeat(33);
        let out = process(ApiKeyInput {
            count: 1,
            length: 16,
            prefix: long_prefix,
            format: ApiKeyFormat::Prefixed,
            charset: ApiKeyCharset::Alphanumeric,
        });
        assert!(out.error.is_some());
        assert!(out.keys.is_empty());
    }
}


