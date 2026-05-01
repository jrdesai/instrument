//! Base32 encode/decode — RFC 4648 (standard) and Crockford variants.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Base32Variant {
    Standard,
    Crockford,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Base32Mode {
    Encode,
    Decode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Base32Input {
    pub text: String,
    pub variant: Base32Variant,
    pub mode: Base32Mode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Base32Output {
    pub result: String,
    pub error: Option<String>,
}

pub fn process(input: Base32Input) -> Base32Output {
    let alphabet = match input.variant {
        Base32Variant::Standard => base32::Alphabet::RFC4648 { padding: true },
        Base32Variant::Crockford => base32::Alphabet::Crockford,
    };

    match input.mode {
        Base32Mode::Encode => {
            let result = base32::encode(alphabet, input.text.as_bytes());
            Base32Output {
                result,
                error: None,
            }
        }
        Base32Mode::Decode => {
            let trimmed = input.text.trim();
            match base32::decode(alphabet, trimmed) {
                Some(bytes) => match String::from_utf8(bytes) {
                    Ok(s) => Base32Output {
                        result: s,
                        error: None,
                    },
                    Err(_) => Base32Output {
                        result: String::new(),
                        error: Some("Decoded bytes are not valid UTF-8 text.".to_string()),
                    },
                },
                None => Base32Output {
                    result: String::new(),
                    error: Some(format!(
                        "Invalid {} Base32 — check the input string.",
                        match input.variant {
                            Base32Variant::Standard => "RFC 4648",
                            Base32Variant::Crockford => "Crockford",
                        }
                    )),
                },
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_standard() {
        let out = process(Base32Input {
            text: "Hello".to_string(),
            variant: Base32Variant::Standard,
            mode: Base32Mode::Encode,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "JBSWY3DP");
    }

    #[test]
    fn roundtrip_standard() {
        let encoded = process(Base32Input {
            text: "instrument".to_string(),
            variant: Base32Variant::Standard,
            mode: Base32Mode::Encode,
        });
        assert!(encoded.error.is_none());
        let decoded = process(Base32Input {
            text: encoded.result,
            variant: Base32Variant::Standard,
            mode: Base32Mode::Decode,
        });
        assert!(decoded.error.is_none());
        assert_eq!(decoded.result, "instrument");
    }

    #[test]
    fn roundtrip_crockford() {
        let encoded = process(Base32Input {
            text: "hello world".to_string(),
            variant: Base32Variant::Crockford,
            mode: Base32Mode::Encode,
        });
        assert!(encoded.error.is_none());
        let decoded = process(Base32Input {
            text: encoded.result,
            variant: Base32Variant::Crockford,
            mode: Base32Mode::Decode,
        });
        assert!(decoded.error.is_none());
        assert_eq!(decoded.result, "hello world");
    }

    #[test]
    fn invalid_decode() {
        let out = process(Base32Input {
            text: "!!!".to_string(),
            variant: Base32Variant::Standard,
            mode: Base32Mode::Decode,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }
}
