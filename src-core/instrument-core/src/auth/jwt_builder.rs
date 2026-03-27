//! JWT build: create and sign JWTs with HMAC (HS256/384/512) or alg:none.
//!
//! Builds header and payload JSON, base64url-encodes them, and optionally
//! signs with a secret. For testing only — do not use with production secrets.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use chrono::Utc;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use sha2::{Sha256, Sha384, Sha512};

use crate::auth::jwt_decoder::{decode_secret, SecretEncoding};

/// Input for JWT build.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JwtBuildInput {
    pub algorithm: JwtAlgorithm,
    pub secret: String,
    pub secret_encoding: SecretEncoding,
    /// Raw JSON string for payload (empty treated as "{}").
    pub payload_json: String,
    pub include_iat: bool,
    pub include_exp: bool,
    /// Seconds from now for exp when include_exp is true.
    pub exp_seconds: i64,
    /// Optional extra header claims as JSON, e.g. {"kid": "my-key-id"}.
    pub extra_headers: String,
}

/// Signing algorithm for the JWT.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[ts(export)]
pub enum JwtAlgorithm {
    #[serde(rename = "HS256")]
    HS256,
    #[serde(rename = "HS384")]
    HS384,
    #[serde(rename = "HS512")]
    HS512,
    #[serde(rename = "none")]
    None,
}

/// Output of JWT build.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JwtBuildOutput {
    pub token: String,
    pub header_json: String,
    pub payload_json: String,
    pub header_b64: String,
    pub payload_b64: String,
    pub signature_b64: String,
    pub algorithm: String,
    pub expires_at: Option<String>,
    pub issued_at: Option<String>,
    pub error: Option<String>,
}

fn empty_output(err: String) -> JwtBuildOutput {
    JwtBuildOutput {
        token: String::new(),
        header_json: String::new(),
        payload_json: String::new(),
        header_b64: String::new(),
        payload_b64: String::new(),
        signature_b64: String::new(),
        algorithm: String::new(),
        expires_at: None,
        issued_at: None,
        error: Some(err),
    }
}

fn base64url_encode(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

fn sign_hmac_sha256(secret: &[u8], message: &[u8]) -> Vec<u8> {
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC key length");
    mac.update(message);
    mac.finalize().into_bytes().to_vec()
}

fn sign_hmac_sha384(secret: &[u8], message: &[u8]) -> Vec<u8> {
    type HmacSha384 = Hmac<Sha384>;
    let mut mac = HmacSha384::new_from_slice(secret).expect("HMAC key length");
    mac.update(message);
    mac.finalize().into_bytes().to_vec()
}

fn sign_hmac_sha512(secret: &[u8], message: &[u8]) -> Vec<u8> {
    type HmacSha512 = Hmac<Sha512>;
    let mut mac = HmacSha512::new_from_slice(secret).expect("HMAC key length");
    mac.update(message);
    mac.finalize().into_bytes().to_vec()
}

/// Build and sign a JWT.
///
/// Payload is parsed from JSON; iat/exp are added if requested.
/// Secret is decoded according to secret_encoding before signing.
/// Algorithm None produces an unsigned token (token ends with ".").
pub fn process(input: JwtBuildInput) -> JwtBuildOutput {
    let alg_str = match input.algorithm {
        JwtAlgorithm::HS256 => "HS256",
        JwtAlgorithm::HS384 => "HS384",
        JwtAlgorithm::HS512 => "HS512",
        JwtAlgorithm::None => "none",
    };

    let mut header_value: serde_json::Value = serde_json::json!({
        "alg": alg_str,
        "typ": "JWT"
    });

    if !input.extra_headers.trim().is_empty() {
        let extra: serde_json::Value = match serde_json::from_str(input.extra_headers.trim()) {
            Ok(v) => v,
            Err(e) => return empty_output(format!("Invalid extra headers JSON: {}", e)),
        };
        if let (Some(obj), Some(extra_obj)) = (
            header_value.as_object_mut(),
            extra.as_object(),
        ) {
            for (k, v) in extra_obj {
                obj.insert(k.clone(), v.clone());
            }
        }
    }

    let header_json = serde_json::to_string_pretty(&header_value).unwrap_or_default();

    let payload_str = input.payload_json.trim();
    let payload_str = if payload_str.is_empty() { "{}" } else { payload_str };

    let mut payload_value: serde_json::Value = match serde_json::from_str(payload_str) {
        Ok(v) => v,
        Err(e) => return empty_output(format!("Invalid payload JSON: {}", e)),
    };

    if !payload_value.is_object() {
        return empty_output("Payload must be a JSON object".to_string());
    }

    let now = Utc::now();
    let now_ts = now.timestamp();
    let now_human = format!("{} UTC", now.format("%Y-%m-%d %H:%M:%S"));

    if input.include_iat {
        payload_value
            .as_object_mut()
            .expect("payload is object")
            .insert("iat".to_string(), serde_json::Value::Number(now_ts.into()));
    }
    if input.include_exp {
        let exp_ts = now_ts + input.exp_seconds;
        payload_value
            .as_object_mut()
            .expect("payload is object")
            .insert("exp".to_string(), serde_json::Value::Number(exp_ts.into()));
    }

    let payload_json = serde_json::to_string_pretty(&payload_value).unwrap_or_default();

    let issued_at = if input.include_iat {
        Some(now_human.clone())
    } else {
        None
    };

    let expires_at = if input.include_exp {
        let exp_ts = now_ts + input.exp_seconds;
        Some(
            chrono::DateTime::from_timestamp(exp_ts, 0)
                .map(|dt| format!("{} UTC", dt.format("%Y-%m-%d %H:%M:%S")))
                .unwrap_or_else(|| exp_ts.to_string()),
        )
    } else {
        None
    };

    let header_b64 = base64url_encode(header_json.as_bytes());
    let payload_b64 = base64url_encode(payload_json.as_bytes());
    let signing_input = format!("{}.{}", header_b64, payload_b64);

    let (signature_b64, token) = match input.algorithm {
        JwtAlgorithm::None => {
            (String::new(), format!("{}.", signing_input))
        }
        JwtAlgorithm::HS256 | JwtAlgorithm::HS384 | JwtAlgorithm::HS512 => {
            if input.secret.trim().is_empty() {
                return empty_output("Secret is required for HS256/HS384/HS512".to_string());
            }
            let secret_bytes = match decode_secret(&input.secret, input.secret_encoding) {
                Ok(b) => b,
                Err(e) => return empty_output(e),
            };
            let sig_bytes = match input.algorithm {
                JwtAlgorithm::HS256 => sign_hmac_sha256(&secret_bytes, signing_input.as_bytes()),
                JwtAlgorithm::HS384 => sign_hmac_sha384(&secret_bytes, signing_input.as_bytes()),
                JwtAlgorithm::HS512 => sign_hmac_sha512(&secret_bytes, signing_input.as_bytes()),
                JwtAlgorithm::None => unreachable!(),
            };
            let sig_b64 = base64url_encode(&sig_bytes);
            let token = format!("{}.{}", signing_input, sig_b64);
            (sig_b64, token)
        }
    };

    JwtBuildOutput {
        token,
        header_json,
        payload_json,
        header_b64,
        payload_b64,
        signature_b64,
        algorithm: alg_str.to_string(),
        expires_at,
        issued_at,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_hs256() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::HS256,
            secret: "secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: r#"{"sub":"1234"}"#.to_string(),
            include_iat: false,
            include_exp: false,
            exp_seconds: 0,
            extra_headers: String::new(),
        });
        assert!(out.error.is_none());
    let parts: Vec<&str> = out.token.split('.').collect();
    assert_eq!(parts.len(), 3);
    assert!(!out.token.is_empty());
    assert_eq!(out.algorithm, "HS256");
    }

    #[test]
    fn build_with_iat() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::HS256,
            secret: "secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: "{}".to_string(),
            include_iat: true,
            include_exp: false,
            exp_seconds: 0,
            extra_headers: String::new(),
        });
        assert!(out.error.is_none());
        assert!(out.payload_json.contains("iat"));
        assert!(out.issued_at.is_some());
    }

    #[test]
    fn build_with_exp() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::HS256,
            secret: "secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: "{}".to_string(),
            include_iat: true,
            include_exp: true,
            exp_seconds: 3600,
            extra_headers: String::new(),
        });
        assert!(out.error.is_none());
        assert!(out.payload_json.contains("exp"));
        assert!(out.payload_json.contains("iat"));
        let payload: serde_json::Value = serde_json::from_str(&out.payload_json).unwrap();
        let iat = payload.get("iat").and_then(|v| v.as_i64()).unwrap();
        let exp = payload.get("exp").and_then(|v| v.as_i64()).unwrap();
        assert!((exp - iat - 3600).abs() < 2);
        assert!(out.expires_at.is_some());
    }

    #[test]
    fn build_none() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::None,
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: "{}".to_string(),
            include_iat: false,
            include_exp: false,
            exp_seconds: 0,
            extra_headers: String::new(),
        });
        assert!(out.error.is_none());
        assert!(out.token.ends_with("."));
        assert!(out.header_json.contains("none"));
    }

    #[test]
    fn verify_roundtrip() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::HS256,
            secret: "my-secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: r#"{"sub":"user1"}"#.to_string(),
            include_iat: false,
            include_exp: false,
            exp_seconds: 0,
            extra_headers: String::new(),
        });
        assert!(out.error.is_none());

        use crate::auth::jwt_decoder::{process as decode_process, JwtDecodeInput};
        let decoded = decode_process(JwtDecodeInput {
            token: out.token.clone(),
            secret: "my-secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert_eq!(decoded.signature_valid, Some(true));
    }

    #[test]
    fn invalid_payload() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::HS256,
            secret: "secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: "not json".to_string(),
            include_iat: false,
            include_exp: false,
            exp_seconds: 0,
            extra_headers: String::new(),
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn empty_secret_hs256() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::HS256,
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: "{}".to_string(),
            include_iat: false,
            include_exp: false,
            exp_seconds: 0,
            extra_headers: String::new(),
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn extra_headers() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::HS256,
            secret: "secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: "{}".to_string(),
            include_iat: false,
            include_exp: false,
            exp_seconds: 0,
            extra_headers: r#"{"kid":"key1"}"#.to_string(),
        });
        assert!(out.error.is_none());
        assert!(out.header_json.contains("kid"));
    }

    #[test]
    fn invalid_extra_headers() {
        let out = process(JwtBuildInput {
            algorithm: JwtAlgorithm::HS256,
            secret: "secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
            payload_json: "{}".to_string(),
            include_iat: false,
            include_exp: false,
            exp_seconds: 0,
            extra_headers: "not json".to_string(),
        });
        assert!(out.error.is_some());
    }
}
