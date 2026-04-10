//! Encode and decode HTTP Basic Authorization header values (RFC 7617-style user:pass → Base64).

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Whether to encode credentials to a header or decode an existing header.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum BasicAuthMode {
    Encode,
    Decode,
}

/// Input for the Basic Auth Header tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BasicAuthInput {
    pub mode: BasicAuthMode,
    pub username: String,
    pub password: String,
    pub header: String,
}

/// Output: always all fields present; unused strings are empty on error or opposite mode.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BasicAuthOutput {
    pub encoded: String,
    pub decoded_username: String,
    pub decoded_password: String,
    pub raw_base64: String,
    pub error: Option<String>,
}

fn empty_output(error: String) -> BasicAuthOutput {
    BasicAuthOutput {
        encoded: String::new(),
        decoded_username: String::new(),
        decoded_password: String::new(),
        raw_base64: String::new(),
        error: Some(error),
    }
}

/// Encodes or decodes a Basic Authorization header value.
pub fn process(input: BasicAuthInput) -> BasicAuthOutput {
    match input.mode {
        BasicAuthMode::Encode => {
            let combined = format!("{}:{}", input.username, input.password);
            let raw = STANDARD.encode(combined.as_bytes());
            let encoded = format!("Basic {}", raw);
            BasicAuthOutput {
                encoded,
                raw_base64: raw,
                decoded_username: String::new(),
                decoded_password: String::new(),
                error: None,
            }
        }
        BasicAuthMode::Decode => {
            let trimmed = input.header.trim();
            let after_scheme = if trimmed.len() >= 6 && trimmed[..6].eq_ignore_ascii_case("basic ") {
                &trimmed[6..]
            } else if trimmed.len() >= 5 && trimmed[..5].eq_ignore_ascii_case("basic") {
                trimmed[5..].trim_start()
            } else {
                return empty_output(
                    "Expected a value starting with \"Basic \" followed by Base64.".to_string(),
                );
            };

            let b64 = after_scheme.trim();
            if b64.is_empty() {
                return empty_output(
                    "Expected a value starting with \"Basic \" followed by Base64.".to_string(),
                );
            }

            let bytes = match STANDARD.decode(b64.as_bytes()) {
                Ok(b) => b,
                Err(_) => return empty_output("Invalid Base64 in Basic credentials.".to_string()),
            };

            let creds = match String::from_utf8(bytes) {
                Ok(s) => s,
                Err(_) => return empty_output("Decoded credentials are not valid UTF-8.".to_string()),
            };

            let (user, pass) = match creds.split_once(':') {
                Some((u, p)) => (u.to_string(), p.to_string()),
                None => {
                    return empty_output(
                        "Decoded value must contain a ':' between username and password.".to_string(),
                    );
                }
            };

            BasicAuthOutput {
                encoded: format!("Basic {}", b64),
                raw_base64: b64.to_string(),
                decoded_username: user,
                decoded_password: pass,
                error: None,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode() {
        let out = process(BasicAuthInput {
            mode: BasicAuthMode::Encode,
            username: "user".to_string(),
            password: "pass".to_string(),
            header: String::new(),
        });
        assert!(out.error.is_none());
        assert_eq!(out.encoded, "Basic dXNlcjpwYXNz");
        assert_eq!(out.raw_base64, "dXNlcjpwYXNz");
    }

    #[test]
    fn test_decode() {
        let out = process(BasicAuthInput {
            mode: BasicAuthMode::Decode,
            username: String::new(),
            password: String::new(),
            header: "Basic dXNlcjpwYXNz".to_string(),
        });
        assert!(out.error.is_none());
        assert_eq!(out.decoded_username, "user");
        assert_eq!(out.decoded_password, "pass");
    }

    #[test]
    fn test_decode_colon_in_password() {
        let inner = STANDARD.encode(b"user:p:a:s:s");
        let header = format!("Basic {}", inner);
        let out = process(BasicAuthInput {
            mode: BasicAuthMode::Decode,
            username: String::new(),
            password: String::new(),
            header,
        });
        assert!(out.error.is_none());
        assert_eq!(out.decoded_username, "user");
        assert_eq!(out.decoded_password, "p:a:s:s");
    }
}
