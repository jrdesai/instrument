//! Base64 encode/decode using the `base64` crate.

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the Base64 tool: text to encode or decode, engine choice, and mode.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Base64Input {
    pub text: String,
    pub url_safe: bool,
    pub mode: Base64Mode,
}

/// Whether to encode or decode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Base64Mode {
    Encode,
    Decode,
}

/// Output: result string, counts, and optional error message.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Base64Output {
    pub result: String,
    pub byte_count: u32,
    pub char_count: u32,
    pub error: Option<String>,
}

/// Process Base64 encode or decode.
///
/// Uses `URL_SAFE_NO_PAD` when `url_safe` is true, otherwise `STANDARD`.
/// On decode failure, returns a helpful error in `output.error` and empty result.
///
/// # Example
///
/// ```
/// use instrument_core::encoding::base64::{process, Base64Input, Base64Mode};
///
/// let out = process(Base64Input {
///     text: "hello".to_string(),
///     url_safe: false,
///     mode: Base64Mode::Encode,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.result, "aGVsbG8=");
/// ```
pub fn process(input: Base64Input) -> Base64Output {
    match input.mode {
        Base64Mode::Encode => encode(input),
        Base64Mode::Decode => decode(input),
    }
}

fn encode(input: Base64Input) -> Base64Output {
    let bytes = input.text.as_bytes();
    let encoded = if input.url_safe {
        URL_SAFE_NO_PAD.encode(bytes)
    } else {
        STANDARD.encode(bytes)
    };
    Base64Output {
        result: encoded.clone(),
        byte_count: u32::try_from(bytes.len()).unwrap_or(u32::MAX),
        char_count: u32::try_from(encoded.chars().count()).unwrap_or(u32::MAX),
        error: None,
    }
}

fn decode(input: Base64Input) -> Base64Output {
    let trimmed = input.text.trim();
    let decoded = if input.url_safe {
        URL_SAFE_NO_PAD.decode(trimmed)
    } else {
        STANDARD.decode(trimmed)
    };
    match decoded {
        Ok(bytes) => {
            let byte_count = u32::try_from(bytes.len()).unwrap_or(u32::MAX);
            let result = match String::from_utf8(bytes) {
                Ok(s) => s,
                Err(_) => {
                    return Base64Output {
                        result: String::new(),
                        byte_count: 0,
                        char_count: 0,
                        error: Some("Decoded bytes are not valid UTF-8".to_string()),
                    }
                }
            };
            Base64Output {
                char_count: u32::try_from(trimmed.chars().count()).unwrap_or(u32::MAX),
                byte_count,
                result,
                error: None,
            }
        }
        Err(e) => Base64Output {
            result: String::new(),
            byte_count: 0,
            char_count: u32::try_from(trimmed.chars().count()).unwrap_or(u32::MAX),
            error: Some(format!(
                "Invalid Base64: {}. Check padding and alphabet (standard vs URL-safe).",
                e
            )),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_standard() {
        let out = process(Base64Input {
            text: "hello".to_string(),
            url_safe: false,
            mode: Base64Mode::Encode,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "aGVsbG8=");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn encodes_url_safe() {
        let out = process(Base64Input {
            text: "hello".to_string(),
            url_safe: true,
            mode: Base64Mode::Encode,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "aGVsbG8");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn decodes_valid() {
        let out = process(Base64Input {
            text: "aGVsbG8=".to_string(),
            url_safe: false,
            mode: Base64Mode::Decode,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "hello");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn decodes_invalid_returns_error() {
        let out = process(Base64Input {
            text: "not!!!valid!!!base64!!!".to_string(),
            url_safe: false,
            mode: Base64Mode::Decode,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }
}
