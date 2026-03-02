//! URL percent-encode/decode using the `percent-encoding` crate.
//!
//! Supports two encode types: **Full** (encodes everything including `/`, `?`, `&`, `=`)
//! and **Component** (encodes special chars but preserves `/` for path segments).

use percent_encoding::{percent_decode_str, utf8_percent_encode, AsciiSet, CONTROLS, NON_ALPHANUMERIC};
use serde::{Deserialize, Serialize};

/// Input for the URL encode/decode tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UrlEncodeInput {
    pub text: String,
    pub mode: UrlEncodeMode,
    pub encode_type: UrlEncodeType,
}

/// Whether to encode or decode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UrlEncodeMode {
    Encode,
    Decode,
}

/// Full: encodes everything including / ? & =.
/// Component: encodes only special chars, preserves / (e.g. for path segments).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UrlEncodeType {
    Full,
    Component,
}

/// Set for component encoding: reserve / so path separators are preserved.
/// Encodes space, ?, &, =, #, %, +, and other RFC 3986 reserved/unreserved that are unsafe in query/path.
const COMPONENT: &AsciiSet = &CONTROLS
    .add(b' ')
    .add(b'!')
    .add(b'"')
    .add(b'#')
    .add(b'$')
    .add(b'%')
    .add(b'&')
    .add(b'\'')
    .add(b'(')
    .add(b')')
    .add(b'*')
    .add(b'+')
    .add(b',')
    .add(b':')
    .add(b';')
    .add(b'=')
    .add(b'?')
    .add(b'@')
    .add(b'[')
    .add(b']')
    .add(b'<')
    .add(b'>');

/// Output: result string and optional error message.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UrlEncodeOutput {
    pub result: String,
    pub error: Option<String>,
}

/// Process URL encode or decode.
///
/// **Encode:** Full uses `NON_ALPHANUMERIC` (encodes / ? & = etc.). Component uses a set that preserves `/`.
/// **Decode:** Percent-decode the string; invalid UTF-8 or malformed sequences produce an error.
///
/// # Example
///
/// ```
/// use instrument_core::encoding::url::{process, UrlEncodeInput, UrlEncodeMode, UrlEncodeType};
///
/// let out = process(UrlEncodeInput {
///     text: "hello world".to_string(),
///     mode: UrlEncodeMode::Encode,
///     encode_type: UrlEncodeType::Full,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.result, "hello%20world");
/// ```
pub fn process(input: UrlEncodeInput) -> UrlEncodeOutput {
    match input.mode {
        UrlEncodeMode::Encode => encode(input),
        UrlEncodeMode::Decode => decode(input),
    }
}

fn encode(input: UrlEncodeInput) -> UrlEncodeOutput {
    let encoded = match input.encode_type {
        UrlEncodeType::Full => utf8_percent_encode(&input.text, NON_ALPHANUMERIC).to_string(),
        UrlEncodeType::Component => utf8_percent_encode(&input.text, COMPONENT).to_string(),
    };
    UrlEncodeOutput {
        result: encoded,
        error: None,
    }
}

fn is_hex(b: u8) -> bool {
    matches!(b, b'0'..=b'9' | b'a'..=b'f' | b'A'..=b'F')
}

/// Validates that every `%` is followed by exactly two hex digits.
/// Returns `None` if valid, `Some(error_message)` if invalid.
fn validate_percent_sequences(s: &str) -> Option<String> {
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            if i + 2 >= bytes.len() {
                let seq: String = bytes[i..].iter().map(|&b| b as char).collect();
                return Some(format!(
                    "Invalid percent sequence at position {}: %{} is not valid (incomplete)",
                    i,
                    seq.get(1..).unwrap_or("")
                ));
            }
            let c1 = bytes[i + 1];
            let c2 = bytes[i + 2];
            if !is_hex(c1) || !is_hex(c2) {
                let seq = format!("%{}{}", c1 as char, c2 as char);
                return Some(format!(
                    "Invalid percent sequence at position {}: {} is not valid hex",
                    i, seq
                ));
            }
            i += 3;
        } else {
            i += 1;
        }
    }
    None
}

fn decode(input: UrlEncodeInput) -> UrlEncodeOutput {
    let trimmed = input.text.trim();
    if let Some(err) = validate_percent_sequences(trimmed) {
        return UrlEncodeOutput {
            result: String::new(),
            error: Some(err),
        };
    }
    match percent_decode_str(trimmed).decode_utf8() {
        Ok(decoded) => UrlEncodeOutput {
            result: decoded.to_string(),
            error: None,
        },
        Err(_) => UrlEncodeOutput {
            result: String::new(),
            error: Some(
                "Decoded bytes are not valid UTF-8. Input may contain binary data.".to_string(),
            ),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_full() {
        let out = process(UrlEncodeInput {
            text: "a/b?c=1&d=2".to_string(),
            mode: UrlEncodeMode::Encode,
            encode_type: UrlEncodeType::Full,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "a%2Fb%3Fc%3D1%26d%3D2");
    }

    #[test]
    fn encode_component() {
        let out = process(UrlEncodeInput {
            text: "path/segment?foo=bar".to_string(),
            mode: UrlEncodeMode::Encode,
            encode_type: UrlEncodeType::Component,
        });
        assert!(out.error.is_none());
        // / preserved, ? and = encoded
        assert!(out.result.contains("path/segment"));
        assert!(out.result.contains("%3F"));
        assert!(out.result.contains("%3D"));
    }

    #[test]
    fn decode_valid() {
        let out = process(UrlEncodeInput {
            text: "hello%20world".to_string(),
            mode: UrlEncodeMode::Decode,
            encode_type: UrlEncodeType::Full,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "hello world");
    }

    #[test]
    fn decode_invalid() {
        // %FF is invalid UTF-8 when decoded as a byte sequence
        let out = process(UrlEncodeInput {
            text: "bad%FF".to_string(),
            mode: UrlEncodeMode::Decode,
            encode_type: UrlEncodeType::Full,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }

    #[test]
    fn decode_invalid_percent_sequence() {
        let out = process(UrlEncodeInput {
            text: "hello%ZZworld".to_string(),
            mode: UrlEncodeMode::Decode,
            encode_type: UrlEncodeType::Full,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }

    #[test]
    fn decode_incomplete_percent_sequence() {
        let out = process(UrlEncodeInput {
            text: "hello%2".to_string(),
            mode: UrlEncodeMode::Decode,
            encode_type: UrlEncodeType::Full,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }

    #[test]
    fn round_trip() {
        let original = "foo bar/baz?x=1";
        let encoded = process(UrlEncodeInput {
            text: original.to_string(),
            mode: UrlEncodeMode::Encode,
            encode_type: UrlEncodeType::Component,
        });
        assert!(encoded.error.is_none());
        let decoded = process(UrlEncodeInput {
            text: encoded.result,
            mode: UrlEncodeMode::Decode,
            encode_type: UrlEncodeType::Component,
        });
        assert!(decoded.error.is_none());
        assert_eq!(decoded.result, original);
    }
}
