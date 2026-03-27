//! Hex encode/decode utilities.
//!
//! **TextToHex:** converts UTF-8 text into lowercase hex bytes with an optional separator.
//! **HexToText:** parses hex back into UTF-8 text, validating length and characters.
//!
//! Examples:
//!
//! ```rust
//! use instrument_core::encoding::hex::{process, HexInput, HexMode, HexSeparator};
//!
//! let out = process(HexInput {
//!     text: "Hello".to_string(),
//!     mode: HexMode::TextToHex,
//!     separator: HexSeparator::Space,
//! });
//! assert!(out.error.is_none());
//! assert_eq!(out.result, "48 65 6c 6c 6f");
//! ```

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the Hex converter.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HexInput {
    pub text: String,
    pub mode: HexMode,
    pub separator: HexSeparator,
}

/// Conversion direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum HexMode {
    TextToHex,
    HexToText,
}

/// Separator style when encoding bytes to hex.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum HexSeparator {
    None,
    Space,
    Colon,
    Dash,
}

/// Output for the Hex converter.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HexOutput {
    pub result: String,
    pub byte_count: usize,
    pub error: Option<String>,
}

/// Process Hex encode/decode.
pub fn process(input: HexInput) -> HexOutput {
    match input.mode {
        HexMode::TextToHex => text_to_hex(input),
        HexMode::HexToText => hex_to_text(input),
    }
}

fn separator_str(sep: HexSeparator) -> &'static str {
    match sep {
        HexSeparator::None => "",
        HexSeparator::Space => " ",
        HexSeparator::Colon => ":",
        HexSeparator::Dash => "-",
    }
}

fn text_to_hex(input: HexInput) -> HexOutput {
    let bytes = input.text.as_bytes();
    let sep = separator_str(input.separator);

    let mut out = String::new();
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && !sep.is_empty() {
            out.push_str(sep);
        }
        use std::fmt::Write as _;
        let _ = write!(&mut out, "{:02x}", b);
    }

    HexOutput {
        result: out,
        byte_count: bytes.len(),
        error: None,
    }
}

fn hex_to_text(input: HexInput) -> HexOutput {
    // Strip whitespace and common separators before parsing.
    let cleaned: String = input
        .text
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ':' && *c != '-')
        .collect();

    if cleaned.is_empty() {
        return HexOutput {
            result: String::new(),
            byte_count: 0,
            error: None,
        };
    }

    if !cleaned.len().is_multiple_of(2) {
        return HexOutput {
            result: String::new(),
            byte_count: 0,
            error: Some(format!(
                "Hex string has odd length ({} characters) after stripping separators. Expected an even number of hex digits.",
                cleaned.len()
            )),
        };
    }

    // Validate and decode hex pairs.
    let bytes_len = cleaned.len() / 2;
    let mut bytes = Vec::with_capacity(bytes_len);
    let chars: Vec<char> = cleaned.chars().collect();

    for i in (0..chars.len()).step_by(2) {
        let c1 = chars[i];
        let c2 = chars[i + 1];
        if !is_hex_char(c1) {
            return HexOutput {
                result: String::new(),
                byte_count: 0,
                error: Some(format!(
                    "Invalid hex character '{}' at position {}.",
                    c1, i
                )),
            };
        }
        if !is_hex_char(c2) {
            return HexOutput {
                result: String::new(),
                byte_count: 0,
                error: Some(format!(
                    "Invalid hex character '{}' at position {}.",
                    c2, i + 1
                )),
            };
        }
        let pair = format!("{}{}", c1, c2);
        match u8::from_str_radix(&pair, 16) {
            Ok(b) => bytes.push(b),
            Err(_) => {
                return HexOutput {
                    result: String::new(),
                    byte_count: 0,
                    error: Some(format!(
                        "Failed to parse hex byte '{}' at positions {}-{}.",
                        pair, i, i + 1
                    )),
                }
            }
        }
    }

    match String::from_utf8(bytes) {
        Ok(s) => {
            let byte_count = s.len();
            HexOutput {
                result: s,
                byte_count,
                error: None,
            }
        }
        Err(_) => HexOutput {
            result: String::new(),
            byte_count: 0,
            error: Some(
                "Decoded bytes are not valid UTF-8. Input may contain binary data.".to_string(),
            ),
        },
    }
}

fn is_hex_char(c: char) -> bool {
    c.is_ascii_hexdigit()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_to_hex_no_separator() {
        let out = process(HexInput {
            text: "Hello".to_string(),
            mode: HexMode::TextToHex,
            separator: HexSeparator::None,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "48656c6c6f");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn text_to_hex_space() {
        let out = process(HexInput {
            text: "Hello".to_string(),
            mode: HexMode::TextToHex,
            separator: HexSeparator::Space,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "48 65 6c 6c 6f");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn text_to_hex_colon() {
        let out = process(HexInput {
            text: "Hello".to_string(),
            mode: HexMode::TextToHex,
            separator: HexSeparator::Colon,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "48:65:6c:6c:6f");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn text_to_hex_dash() {
        let out = process(HexInput {
            text: "Hello".to_string(),
            mode: HexMode::TextToHex,
            separator: HexSeparator::Dash,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "48-65-6c-6c-6f");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn hex_to_text_valid() {
        let out = process(HexInput {
            text: "48656c6c6f".to_string(),
            mode: HexMode::HexToText,
            separator: HexSeparator::None,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "Hello");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn hex_to_text_with_spaces() {
        let out = process(HexInput {
            text: "48 65 6c 6c 6f".to_string(),
            mode: HexMode::HexToText,
            separator: HexSeparator::Space,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "Hello");
        assert_eq!(out.byte_count, 5);
    }

    #[test]
    fn hex_to_text_invalid_char() {
        let out = process(HexInput {
            text: "48 65 6c 6c 6z".to_string(),
            mode: HexMode::HexToText,
            separator: HexSeparator::Space,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
        assert!(out.error.unwrap().contains('z'));
    }

    #[test]
    fn hex_to_text_odd_length() {
        let out = process(HexInput {
            text: "48 65 6c 6c 6".to_string(),
            mode: HexMode::HexToText,
            separator: HexSeparator::Space,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }

    #[test]
    fn round_trip() {
        let original = "Hello";
        let encoded = process(HexInput {
            text: original.to_string(),
            mode: HexMode::TextToHex,
            separator: HexSeparator::Space,
        });
        assert!(encoded.error.is_none());
        let decoded = process(HexInput {
            text: encoded.result,
            mode: HexMode::HexToText,
            separator: HexSeparator::Space,
        });
        assert!(decoded.error.is_none());
        assert_eq!(decoded.result, original);
    }
}

