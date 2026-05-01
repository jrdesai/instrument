//! Base58 encode/decode — Bitcoin alphabet only.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Base58Mode {
    Encode,
    Decode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Base58Input {
    pub text: String,
    pub mode: Base58Mode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Base58Output {
    pub result: String,
    pub error: Option<String>,
}

pub fn process(input: Base58Input) -> Base58Output {
    match input.mode {
        Base58Mode::Encode => {
            let result = bs58::encode(input.text.as_bytes()).into_string();
            Base58Output {
                result,
                error: None,
            }
        }
        Base58Mode::Decode => match bs58::decode(input.text.trim()).into_vec() {
            Ok(bytes) => match String::from_utf8(bytes) {
                Ok(s) => Base58Output {
                    result: s,
                    error: None,
                },
                Err(_) => Base58Output {
                    result: String::new(),
                    error: Some("Decoded bytes are not valid UTF-8 text.".to_string()),
                },
            },
            Err(e) => Base58Output {
                result: String::new(),
                error: Some(format!("Invalid Base58: {e}.")),
            },
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode() {
        let out = process(Base58Input {
            text: "Hello World".to_string(),
            mode: Base58Mode::Encode,
        });
        assert!(out.error.is_none());
        assert!(!out.result.is_empty());
    }

    #[test]
    fn roundtrip() {
        let encoded = process(Base58Input {
            text: "instrument tool".to_string(),
            mode: Base58Mode::Encode,
        });
        assert!(encoded.error.is_none());
        let decoded = process(Base58Input {
            text: encoded.result,
            mode: Base58Mode::Decode,
        });
        assert!(decoded.error.is_none());
        assert_eq!(decoded.result, "instrument tool");
    }

    #[test]
    fn invalid_decode() {
        let out = process(Base58Input {
            text: "0OIl".to_string(),
            mode: Base58Mode::Decode,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }
}
