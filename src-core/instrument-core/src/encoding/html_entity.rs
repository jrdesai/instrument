//! HTML entity encode/decode.
//!
//! **Encode:** Replaces `&`, `<`, `>`, `"`, `'` with named entities (`&amp;`, `&lt;`, …)
//! or numeric entities (`&#38;`, `&#60;`, …). For HTML, apostrophe uses numeric `&#39;`;
//! named `&apos;` is valid in XML.
//!
//! **Decode:** Handles named entities, decimal `&#38;`, and hex `&#x26;`. Unknown entities
//! like `&foo;` are left as-is.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the HTML entity encode/decode tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HtmlEntityInput {
    pub text: String,
    pub mode: HtmlEntityMode,
    pub encode_type: HtmlEntityEncodeType,
}

/// Whether to encode or decode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum HtmlEntityMode {
    Encode,
    Decode,
}

/// Named: &amp;, &lt;, &gt;, &quot;, &apos;. Numeric: &#38;, &#60;, &#62;, &#34;, &#39;.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum HtmlEntityEncodeType {
    Named,
    Numeric,
}

/// Output: result string, count of entities encoded/decoded, and optional error.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HtmlEntityOutput {
    pub result: String,
    pub entities_found: u32,
    pub error: Option<String>,
}

/// Named entity mappings (decode): entity name without & and ; → char.
const NAMED: &[(&str, char)] = &[
    ("amp", '&'),
    ("lt", '<'),
    ("gt", '>'),
    ("quot", '"'),
    ("apos", '\''),
];

/// Process HTML entity encode or decode.
///
/// # Example
///
/// ```
/// use instrument_core::encoding::html_entity::{
///     process, HtmlEntityInput, HtmlEntityMode, HtmlEntityEncodeType,
/// };
///
/// let out = process(HtmlEntityInput {
///     text: "a < b".to_string(),
///     mode: HtmlEntityMode::Encode,
///     encode_type: HtmlEntityEncodeType::Named,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.result, "a &lt; b");
/// assert_eq!(out.entities_found, 1);
/// ```
pub fn process(input: HtmlEntityInput) -> HtmlEntityOutput {
    match input.mode {
        HtmlEntityMode::Encode => encode(input),
        HtmlEntityMode::Decode => decode(input),
    }
}

fn encode(input: HtmlEntityInput) -> HtmlEntityOutput {
    let (result, entities_found) = match input.encode_type {
        HtmlEntityEncodeType::Named => encode_named(&input.text),
        HtmlEntityEncodeType::Numeric => encode_numeric(&input.text),
    };
    HtmlEntityOutput {
        result,
        entities_found: u32::try_from(entities_found).unwrap_or(u32::MAX),
        error: None,
    }
}

fn encode_named(input: &str) -> (String, usize) {
    let mut out = String::with_capacity(input.len() * 2);
    let mut count = 0usize;
    for c in input.chars() {
        match c {
            '&' => {
                out.push_str("&amp;");
                count += 1;
            }
            '<' => {
                out.push_str("&lt;");
                count += 1;
            }
            '>' => {
                out.push_str("&gt;");
                count += 1;
            }
            '"' => {
                out.push_str("&quot;");
                count += 1;
            }
            '\'' => {
                out.push_str("&apos;");
                count += 1;
            }
            _ => out.push(c),
        }
    }
    (out, count)
}

fn encode_numeric(input: &str) -> (String, usize) {
    let mut out = String::with_capacity(input.len() * 2);
    let mut count = 0usize;
    for c in input.chars() {
        match c {
            '&' => {
                out.push_str("&#38;");
                count += 1;
            }
            '<' => {
                out.push_str("&#60;");
                count += 1;
            }
            '>' => {
                out.push_str("&#62;");
                count += 1;
            }
            '"' => {
                out.push_str("&#34;");
                count += 1;
            }
            '\'' => {
                out.push_str("&#39;");
                count += 1;
            }
            _ => out.push(c),
        }
    }
    (out, count)
}

fn decode(input: HtmlEntityInput) -> HtmlEntityOutput {
    let (result, entities_found) = decode_inner(&input.text);
    HtmlEntityOutput {
        result,
        entities_found: u32::try_from(entities_found).unwrap_or(u32::MAX),
        error: None,
    }
}

fn decode_inner(s: &str) -> (String, usize) {
    let mut out = String::with_capacity(s.len());
    let mut count = 0usize;
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] != b'&' {
            // Safe: we're in a UTF-8 str, so copy the next char
            let start = i;
            i += 1;
            while i < bytes.len() && (bytes[i] & 0xC0) == 0x80 {
                i += 1;
            }
            out.push_str(&s[start..i]);
            continue;
        }
        let amp_pos = i;
        i += 1;
        if i >= bytes.len() {
            out.push('&');
            continue;
        }
        // Find semicolon
        let semicolon = s[i..].find(';');
        let Some(semi_off) = semicolon else {
            out.push('&');
            continue;
        };
        let semi_pos = i + semi_off;
        let between = &s[i..semi_pos];
        i = semi_pos + 1;

        if between.is_empty() {
            out.push('&');
            continue;
        }

        if between == "#" {
            out.push_str(&s[amp_pos..i]);
            continue;
        }

        // Numeric: &#123; or &#x7b;
        if let Some(num) = between.strip_prefix('#') {
            let code = if num.starts_with('x') || num.starts_with('X') {
                num[1..].chars().filter_map(|c| c.to_digit(16)).fold(0u32, |a, d| a * 16 + d)
            } else {
                num.chars().filter_map(|c| c.to_digit(10)).fold(0u32, |a, d| a * 10 + d)
            };
            if let Some(ch) = char::from_u32(code) {
                out.push(ch);
                count += 1;
            } else {
                out.push_str(&s[amp_pos..i]);
            }
            continue;
        }

        // Named: must be alphanumeric
        if between.chars().all(|c| c.is_ascii_alphanumeric()) {
            let mut found = false;
            for (name, ch) in NAMED {
                if between == *name {
                    out.push(*ch);
                    count += 1;
                    found = true;
                    break;
                }
            }
            if !found {
                out.push_str(&s[amp_pos..i]);
            }
        } else {
            out.push_str(&s[amp_pos..i]);
        }
    }
    (out, count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_named() {
        let out = process(HtmlEntityInput {
            text: "<script>".to_string(),
            mode: HtmlEntityMode::Encode,
            encode_type: HtmlEntityEncodeType::Named,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "&lt;script&gt;");
        assert_eq!(out.entities_found, 2);
    }

    #[test]
    fn encode_numeric() {
        let out = process(HtmlEntityInput {
            text: "a & b".to_string(),
            mode: HtmlEntityMode::Encode,
            encode_type: HtmlEntityEncodeType::Numeric,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "a &#38; b");
        assert_eq!(out.entities_found, 1);
    }

    #[test]
    fn decode_named() {
        let out = process(HtmlEntityInput {
            text: "&lt;div&gt;".to_string(),
            mode: HtmlEntityMode::Decode,
            encode_type: HtmlEntityEncodeType::Named,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "<div>");
        assert_eq!(out.entities_found, 2);
    }

    #[test]
    fn decode_numeric() {
        let out = process(HtmlEntityInput {
            text: "&#60;x&#62;".to_string(),
            mode: HtmlEntityMode::Decode,
            encode_type: HtmlEntityEncodeType::Numeric,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "<x>");
        assert_eq!(out.entities_found, 2);
    }

    #[test]
    fn decode_hex_numeric() {
        let out = process(HtmlEntityInput {
            text: "&#x26;".to_string(),
            mode: HtmlEntityMode::Decode,
            encode_type: HtmlEntityEncodeType::Numeric,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "&");
        assert_eq!(out.entities_found, 1);
    }

    #[test]
    fn unknown_entity_left_as_is() {
        let out = process(HtmlEntityInput {
            text: "&foo; bar".to_string(),
            mode: HtmlEntityMode::Decode,
            encode_type: HtmlEntityEncodeType::Named,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "&foo; bar");
        assert_eq!(out.entities_found, 0);
    }

    #[test]
    fn round_trip() {
        let original = "a < b & c \"d\" 'e'";
        let encoded = process(HtmlEntityInput {
            text: original.to_string(),
            mode: HtmlEntityMode::Encode,
            encode_type: HtmlEntityEncodeType::Named,
        });
        assert!(encoded.error.is_none());
        let decoded = process(HtmlEntityInput {
            text: encoded.result,
            mode: HtmlEntityMode::Decode,
            encode_type: HtmlEntityEncodeType::Named,
        });
        assert!(decoded.error.is_none());
        assert_eq!(decoded.result, original);
        assert_eq!(decoded.entities_found, 6); // < & " " ' '
    }
}
