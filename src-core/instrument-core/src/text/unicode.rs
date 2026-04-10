//! Unicode Inspector: per-character codepoint, name, block, category, and UTF-8 bytes.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

const MAX_CHARS: usize = 1000;

/// Input for the Unicode Inspector tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UnicodeInspectInput {
    pub text: String,
}

/// One inspected character row.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UnicodeChar {
    #[serde(rename = "char")]
    #[ts(rename = "char")]
    pub ch: String,
    pub codepoint: u32,
    pub hex: String,
    pub name: String,
    pub block: String,
    pub category: String,
    pub utf8_bytes: Vec<u8>,
    pub utf8_hex: String,
}

/// Output of Unicode inspection.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UnicodeInspectOutput {
    pub chars: Vec<UnicodeChar>,
    pub total_chars: u32,
    pub total_bytes: u32,
    pub error: Option<String>,
}

fn format_hex_u32(cp: u32) -> String {
    format!("U+{:04X}", cp)
}

fn utf8_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<_>>()
        .join(" ")
}

fn unicode_block(cp: u32) -> &'static str {
    match cp {
        0x0000..=0x007F => "Basic Latin",
        0x0080..=0x00FF => "Latin-1 Supplement",
        0x0100..=0x017F => "Latin Extended-A",
        0x0180..=0x024F => "Latin Extended-B",
        0x0250..=0x02AF => "IPA Extensions",
        0x0370..=0x03FF => "Greek and Coptic",
        0x0400..=0x04FF => "Cyrillic",
        0x0590..=0x05FF => "Hebrew",
        0x0600..=0x06FF => "Arabic",
        0x0900..=0x097F => "Devanagari",
        0x3040..=0x309F => "Hiragana",
        0x30A0..=0x30FF => "Katakana",
        0x3400..=0x4DBF => "CJK Unified Ideographs Extension A",
        0x4E00..=0x9FFF => "CJK Unified Ideographs",
        0xAC00..=0xD7AF => "Hangul Syllables",
        0xF900..=0xFAFF => "CJK Compatibility Ideographs",
        0x2190..=0x21FF => "Arrows",
        0x2200..=0x22FF => "Mathematical Operators",
        0x2500..=0x257F => "Box Drawing",
        0x2580..=0x259F => "Block Elements",
        0x25A0..=0x25FF => "Geometric Shapes",
        0x2600..=0x26FF => "Miscellaneous Symbols",
        0x1F600..=0x1F64F => "Emoticons",
        0x1F300..=0x1F5FF => "Miscellaneous Symbols and Pictographs",
        0x1F900..=0x1F9FF => "Supplemental Symbols and Pictographs",
        _ => "Other",
    }
}

fn unicode_category(c: char) -> &'static str {
    if c.is_uppercase() {
        "Uppercase Letter"
    } else if c.is_lowercase() {
        "Lowercase Letter"
    } else if c.is_numeric() {
        "Number"
    } else if c.is_whitespace() {
        "Whitespace"
    } else if c.is_ascii_punctuation() {
        "Punctuation"
    } else if c.is_control() {
        "Control"
    } else {
        "Other Symbol"
    }
}

/// Builds a per-character breakdown of `input.text` (max 1000 code units from `.chars()`).
pub fn process(input: UnicodeInspectInput) -> UnicodeInspectOutput {
    let text = input.text.as_str();
    let total_bytes = text.len() as u32;

    let count = text.chars().count();
    if count > MAX_CHARS {
        return UnicodeInspectOutput {
            chars: Vec::new(),
            total_chars: 0,
            total_bytes,
            error: Some(format!(
                "Input exceeds the maximum of {} characters (got {}).",
                MAX_CHARS, count
            )),
        };
    }

    let mut chars = Vec::with_capacity(count);
    for c in text.chars() {
        let cp = c as u32;
        let mut buf = [0u8; 4];
        let s = c.encode_utf8(&mut buf);
        let bytes = s.as_bytes().to_vec();
        let name = unicode_names2::name(c)
            .map(|n| n.to_string())
            .unwrap_or_else(|| "<unknown>".to_string());
        chars.push(UnicodeChar {
            ch: c.to_string(),
            codepoint: cp,
            hex: format_hex_u32(cp),
            name,
            block: unicode_block(cp).to_string(),
            category: unicode_category(c).to_string(),
            utf8_hex: utf8_hex(&bytes),
            utf8_bytes: bytes,
        });
    }

    UnicodeInspectOutput {
        total_chars: count as u32,
        total_bytes,
        chars,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ascii_chars() {
        let out = process(UnicodeInspectInput {
            text: "ABC".to_string(),
        });
        assert!(out.error.is_none());
        assert_eq!(out.total_chars, 3);
        assert_eq!(out.chars.len(), 3);
        assert_eq!(out.chars[0].codepoint, 65);
        assert_eq!(out.chars[0].hex, "U+0041");
        assert_eq!(out.chars[1].codepoint, 66);
        assert_eq!(out.chars[1].hex, "U+0042");
        assert_eq!(out.chars[2].codepoint, 67);
        assert_eq!(out.chars[2].hex, "U+0043");
    }

    #[test]
    fn test_emoji() {
        let out = process(UnicodeInspectInput {
            text: "🦀".to_string(),
        });
        assert!(out.error.is_none());
        assert_eq!(out.total_chars, 1);
        assert_eq!(out.chars[0].codepoint, 129_408);
        assert_eq!(out.chars[0].utf8_bytes.len(), 4);
    }

    #[test]
    fn test_limit() {
        let text = "a".repeat(1001);
        let out = process(UnicodeInspectInput { text });
        assert!(out.error.is_some());
    }
}
