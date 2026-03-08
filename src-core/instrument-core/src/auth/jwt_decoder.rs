//! JWT decode: parse header, payload, verify HMAC signature (HS256/384/512).
//!
//! Decodes base64url parts, extracts standard claims, formats times with chrono,
//! and optionally verifies the signature when a secret is provided (HMAC only).

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Sha384, Sha512};

/// Input for JWT decode.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtDecodeInput {
    /// The JWT token string (header.payload.signature).
    pub token: String,
    /// Optional secret for HMAC verification; empty string if not provided.
    pub secret: String,
    /// How the secret is encoded when provided.
    pub secret_encoding: SecretEncoding,
}

/// How the verification secret is encoded.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SecretEncoding {
    Utf8,
    Base64,
    Hex,
}

/// Output of JWT decode.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtDecodeOutput {
    /// Base64url-decoded header JSON.
    pub header_raw: String,
    /// Base64url-decoded payload JSON.
    pub payload_raw: String,
    /// Signature bytes as hex.
    pub signature_raw: String,

    pub algorithm: String,
    pub token_type: String,
    pub key_id: Option<String>,

    pub subject: Option<String>,
    pub issuer: Option<String>,
    pub audience: Option<String>,
    pub issued_at: Option<i64>,
    pub expires_at: Option<i64>,
    pub not_before: Option<String>,
    pub jwt_id: Option<String>,

    pub issued_at_human: Option<String>,
    pub expires_at_human: Option<String>,
    pub is_expired: Option<bool>,
    pub time_until_expiry: Option<String>,

    /// Full payload claims as pretty JSON.
    pub all_claims: String,

    pub signature_valid: Option<bool>,
    pub signature_note: String,

    pub part_count: usize,
    pub is_well_formed: bool,

    pub error: Option<String>,
}

fn default_output() -> JwtDecodeOutput {
    JwtDecodeOutput {
        header_raw: String::new(),
        payload_raw: String::new(),
        signature_raw: String::new(),
        algorithm: String::new(),
        token_type: String::new(),
        key_id: None,
        subject: None,
        issuer: None,
        audience: None,
        issued_at: None,
        expires_at: None,
        not_before: None,
        jwt_id: None,
        issued_at_human: None,
        expires_at_human: None,
        is_expired: None,
        time_until_expiry: None,
        all_claims: String::new(),
        signature_valid: None,
        signature_note: String::new(),
        part_count: 0,
        is_well_formed: false,
        error: None,
    }
}

fn base64url_decode(input: &str) -> Result<Vec<u8>, String> {
    let s = input.trim();
    let mut t = s.replace('-', "+").replace('_', "/");
    let rem = t.len() % 4;
    if rem > 0 {
        t.push_str(&"=".repeat(4 - rem));
    }
    STANDARD
        .decode(&t)
        .map_err(|e| format!("Base64 decode error: {}", e))
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn relative_time_string(ts: i64, now: DateTime<Utc>) -> String {
    let dt = match DateTime::from_timestamp(ts, 0) {
        Some(d) => d,
        None => return "invalid timestamp".to_string(),
    };
    let delta = dt.signed_duration_since(now);
    let secs = delta.num_seconds().abs();

    let (value, unit, past) = if secs < 10 {
        (0_i64, "just now", true)
    } else if secs < 60 {
        (secs, "seconds", delta.num_seconds() < 0)
    } else if secs < 3600 {
        (secs / 60, "minutes", delta.num_seconds() < 0)
    } else if secs < 86400 {
        (secs / 3600, "hours", delta.num_seconds() < 0)
    } else if secs < 2_592_000 {
        (secs / 86400, "days", delta.num_seconds() < 0)
    } else if secs < 31_536_000 {
        (secs / 2_592_000, "months", delta.num_seconds() < 0)
    } else {
        (secs / 31_536_000, "years", delta.num_seconds() < 0)
    };

    if unit == "just now" {
        "just now".to_string()
    } else if past {
        format!("{} {} ago", value, unit)
    } else {
        format!("in {} {}", value, unit)
    }
}

fn decode_secret(secret: &str, enc: SecretEncoding) -> Result<Vec<u8>, String> {
    let s = secret.trim();
    if s.is_empty() {
        return Ok(Vec::new());
    }
    match enc {
        SecretEncoding::Utf8 => Ok(s.as_bytes().to_vec()),
        SecretEncoding::Base64 => {
            STANDARD.decode(s).map_err(|e| format!("Base64 secret: {}", e))
        }
        SecretEncoding::Hex => {
            let s = s.strip_prefix("0x").unwrap_or(s);
            if s.len() % 2 != 0 {
                return Err("Hex secret: odd length".to_string());
            }
            (0..s.len())
                .step_by(2)
                .map(|i| u8::from_str_radix(&s[i..i + 2], 16))
                .collect::<Result<Vec<_>, _>>()
                .map_err(|_| "Hex secret: invalid".to_string())
        }
    }
}

fn verify_hmac_sha256(secret: &[u8], message: &[u8], signature: &[u8]) -> bool {
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC key length");
    mac.update(message);
    mac.verify_slice(signature).is_ok()
}

fn verify_hmac_sha384(secret: &[u8], message: &[u8], signature: &[u8]) -> bool {
    type HmacSha384 = Hmac<Sha384>;
    let mut mac = HmacSha384::new_from_slice(secret).expect("HMAC key length");
    mac.update(message);
    mac.verify_slice(signature).is_ok()
}

fn verify_hmac_sha512(secret: &[u8], message: &[u8], signature: &[u8]) -> bool {
    type HmacSha512 = Hmac<Sha512>;
    let mut mac = HmacSha512::new_from_slice(secret).expect("HMAC key length");
    mac.update(message);
    mac.verify_slice(signature).is_ok()
}

/// Decode and optionally verify a JWT.
///
/// # Example
///
/// ```
/// use instrument_core::auth::jwt_decoder::{
///     process, JwtDecodeInput, SecretEncoding,
/// };
///
/// let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
/// let out = process(JwtDecodeInput {
///     token: token.to_string(),
///     secret: String::new(),
///     secret_encoding: SecretEncoding::Utf8,
/// });
/// assert_eq!(out.algorithm, "HS256");
/// assert!(out.is_well_formed);
/// ```
pub fn process(input: JwtDecodeInput) -> JwtDecodeOutput {
    let token = input.token.trim();
    if token.is_empty() {
        return default_output();
    }

    let parts: Vec<&str> = token.split('.').collect();
    let part_count = parts.len();
    if part_count != 3 {
        let mut out = default_output();
        out.part_count = part_count;
        out.is_well_formed = false;
        out.error = Some(format!(
            "Token must have exactly 3 parts (header.payload.signature), got {}",
            part_count
        ));
        return out;
    }

    let header_b64 = parts[0];
    let payload_b64 = parts[1];
    let signature_b64 = parts[2];

    let header_bytes = match base64url_decode(header_b64) {
        Ok(b) => b,
        Err(e) => {
            let mut out = default_output();
            out.part_count = 3;
            out.is_well_formed = true;
            out.error = Some(format!("Header decode: {}", e));
            return out;
        }
    };
    let payload_bytes = match base64url_decode(payload_b64) {
        Ok(b) => b,
        Err(e) => {
            let mut out = default_output();
            out.part_count = 3;
            out.is_well_formed = true;
            out.error = Some(format!("Payload decode: {}", e));
            return out;
        }
    };
    let signature_bytes = match base64url_decode(signature_b64) {
        Ok(b) => b,
        Err(e) => {
            let mut out = default_output();
            out.part_count = 3;
            out.is_well_formed = true;
            out.error = Some(format!("Signature decode: {}", e));
            return out;
        }
    };

    let header_raw = match String::from_utf8(header_bytes.clone()) {
        Ok(s) => s,
        Err(_) => {
            let mut out = default_output();
            out.part_count = 3;
            out.is_well_formed = true;
            out.error = Some("Header is not valid UTF-8".to_string());
            return out;
        }
    };
    let payload_raw = match String::from_utf8(payload_bytes.clone()) {
        Ok(s) => s,
        Err(_) => {
            let mut out = default_output();
            out.part_count = 3;
            out.is_well_formed = true;
            out.error = Some("Payload is not valid UTF-8".to_string());
            return out;
        }
    };

    let header_value: serde_json::Value = match serde_json::from_str(&header_raw) {
        Ok(v) => v,
        Err(e) => {
            let mut out = default_output();
            out.header_raw = header_raw;
            out.payload_raw = payload_raw;
            out.signature_raw = bytes_to_hex(&signature_bytes);
            out.part_count = 3;
            out.is_well_formed = true;
            out.error = Some(format!("Header JSON: {}", e));
            return out;
        }
    };
    let payload_value: serde_json::Value = match serde_json::from_str(&payload_raw) {
        Ok(v) => v,
        Err(e) => {
            let mut out = default_output();
            out.header_raw = header_raw.clone();
            out.payload_raw = payload_raw;
            out.signature_raw = bytes_to_hex(&signature_bytes);
            out.algorithm = header_value
                .get("alg")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            out.token_type = header_value
                .get("typ")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            out.key_id = header_value.get("kid").and_then(|v| v.as_str()).map(String::from);
            out.part_count = 3;
            out.is_well_formed = true;
            out.error = Some(format!("Payload JSON: {}", e));
            return out;
        }
    };

    let algorithm = header_value
        .get("alg")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let token_type = header_value
        .get("typ")
        .and_then(|v| v.as_str())
        .unwrap_or("JWT")
        .to_string();
    let key_id = header_value.get("kid").and_then(|v| v.as_str()).map(String::from);

    let subject = payload_value.get("sub").and_then(|v| v.as_str()).map(String::from);
    let issuer = payload_value.get("iss").and_then(|v| v.as_str()).map(String::from);
    let audience = payload_value
        .get("aud")
        .and_then(|v| {
            v.as_str()
                .map(String::from)
                .or_else(|| v.as_array().and_then(|a| a.first()).and_then(|v| v.as_str()).map(String::from))
        });
    let issued_at = payload_value.get("iat").and_then(|v| v.as_i64());
    let expires_at = payload_value.get("exp").and_then(|v| v.as_i64());
    let nbf = payload_value.get("nbf").and_then(|v| v.as_i64());
    let not_before = nbf.map(|ts| {
        DateTime::from_timestamp(ts, 0)
            .map(|dt| format!("{} UTC", dt.format("%Y-%m-%d %H:%M:%S")))
            .unwrap_or_else(|| ts.to_string())
    });
    let jwt_id = payload_value.get("jti").and_then(|v| v.as_str()).map(String::from);

    let now = Utc::now();
    let issued_at_human = issued_at.map(|ts| {
        DateTime::from_timestamp(ts, 0)
            .map(|dt| format!("{} UTC", dt.format("%Y-%m-%d %H:%M:%S")))
            .unwrap_or_else(|| ts.to_string())
    });
    let expires_at_human = expires_at.map(|ts| {
        DateTime::from_timestamp(ts, 0)
            .map(|dt| format!("{} UTC", dt.format("%Y-%m-%d %H:%M:%S")))
            .unwrap_or_else(|| ts.to_string())
    });
    let is_expired = expires_at.map(|exp| exp < now.timestamp());
    let time_until_expiry = expires_at.map(|exp| relative_time_string(exp, now));

    let all_claims = serde_json::to_string_pretty(&payload_value).unwrap_or_default();

    let (signature_valid, signature_note) = if input.secret.trim().is_empty() {
        (
            None,
            "Cannot verify — no secret provided".to_string(),
        )
    } else if !matches!(algorithm.as_str(), "HS256" | "HS384" | "HS512") {
        (
            None,
            "Verification not supported for RS256/ES256 (asymmetric)".to_string(),
        )
    } else {
        let secret_bytes = match decode_secret(&input.secret, input.secret_encoding) {
            Ok(b) => b,
            Err(e) => {
                let out = JwtDecodeOutput {
                    header_raw: header_raw.clone(),
                    payload_raw: payload_raw.clone(),
                    signature_raw: bytes_to_hex(&signature_bytes),
                    algorithm: algorithm.clone(),
                    token_type: token_type.clone(),
                    key_id: key_id.clone(),
                    subject: subject.clone(),
                    issuer: issuer.clone(),
                    audience: audience.clone(),
                    issued_at,
                    expires_at,
                    not_before: not_before.clone(),
                    jwt_id: jwt_id.clone(),
                    issued_at_human: issued_at_human.clone(),
                    expires_at_human: expires_at_human.clone(),
                    is_expired,
                    time_until_expiry: time_until_expiry.clone(),
                    all_claims: all_claims.clone(),
                    signature_valid: None,
                    signature_note: e,
                    part_count: 3,
                    is_well_formed: true,
                    error: None,
                };
                return out;
            }
        };
        let message = format!("{}.{}", header_b64, payload_b64);
        let valid = match algorithm.as_str() {
            "HS256" => verify_hmac_sha256(&secret_bytes, message.as_bytes(), &signature_bytes),
            "HS384" => verify_hmac_sha384(&secret_bytes, message.as_bytes(), &signature_bytes),
            "HS512" => verify_hmac_sha512(&secret_bytes, message.as_bytes(), &signature_bytes),
            _ => false,
        };
        (
            Some(valid),
            if valid {
                "Signature valid".to_string()
            } else {
                "Signature invalid".to_string()
            },
        )
    };

    JwtDecodeOutput {
        header_raw,
        payload_raw,
        signature_raw: bytes_to_hex(&signature_bytes),
        algorithm,
        token_type,
        key_id,
        subject,
        issuer,
        audience,
        issued_at,
        expires_at,
        not_before,
        jwt_id,
        issued_at_human,
        expires_at_human,
        is_expired,
        time_until_expiry,
        all_claims,
        signature_valid,
        signature_note,
        part_count: 3,
        is_well_formed: true,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID_JWT: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

    #[test]
    fn decode_valid_jwt() {
        let out = process(JwtDecodeInput {
            token: VALID_JWT.to_string(),
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert_eq!(out.algorithm, "HS256");
        assert_eq!(out.subject.as_deref(), Some("1234567890"));
        assert!(out.is_well_formed);
        assert!(out.error.is_none());
    }

    #[test]
    fn decode_header() {
        let out = process(JwtDecodeInput {
            token: VALID_JWT.to_string(),
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert!(out.header_raw.contains("\"alg\""));
        assert_eq!(out.algorithm, "HS256");
    }

    #[test]
    fn decode_payload() {
        let out = process(JwtDecodeInput {
            token: VALID_JWT.to_string(),
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert!(out.all_claims.contains("John Doe"));
    }

    #[test]
    fn verify_valid_signature() {
        let out = process(JwtDecodeInput {
            token: VALID_JWT.to_string(),
            secret: "your-256-bit-secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert_eq!(out.signature_valid, Some(true));
    }

    #[test]
    fn verify_invalid_signature() {
        let out = process(JwtDecodeInput {
            token: VALID_JWT.to_string(),
            secret: "wrong-secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert_eq!(out.signature_valid, Some(false));
    }

    #[test]
    fn invalid_token() {
        let out = process(JwtDecodeInput {
            token: "not.a.jwt".to_string(),
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn two_part_token() {
        let out = process(JwtDecodeInput {
            token: "header.payload".to_string(),
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert!(!out.is_well_formed);
        assert_eq!(out.part_count, 2);
    }

    #[test]
    fn empty_token() {
        let out = process(JwtDecodeInput {
            token: String::new(),
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert!(out.error.is_none());
        assert_eq!(out.part_count, 0);
    }

    #[test]
    fn expired_detection() {
        use base64::engine::general_purpose::URL_SAFE_NO_PAD;
        let payload = "{\"sub\":\"1\",\"exp\":1516239022}"; // 2018-01-18
        let payload_b64 = URL_SAFE_NO_PAD.encode(payload.as_bytes());
        let token = format!("eyJhbGciOiJIUzI1NiJ9.{}.AAAA", payload_b64);
        let out = process(JwtDecodeInput {
            token,
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert_eq!(out.is_expired, Some(true));
    }

    #[test]
    fn future_token() {
        use base64::engine::general_purpose::URL_SAFE_NO_PAD;
        let exp_future = Utc::now().timestamp() + 3600;
        let payload = format!("{{\"sub\":\"1\",\"exp\":{}}}", exp_future);
        let payload_b64 = URL_SAFE_NO_PAD.encode(payload.as_bytes());
        let token = format!("eyJhbGciOiJIUzI1NiJ9.{}.AAAA", payload_b64);
        let out = process(JwtDecodeInput {
            token,
            secret: String::new(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert_eq!(out.is_expired, Some(false));
    }

    #[test]
    fn asymmetric_alg() {
        use base64::engine::general_purpose::URL_SAFE_NO_PAD;
        let header = "{\"alg\":\"RS256\",\"typ\":\"JWT\"}";
        let payload = "{\"sub\":\"1\"}";
        let token = format!(
            "{}.{}",
            URL_SAFE_NO_PAD.encode(header.as_bytes()),
            URL_SAFE_NO_PAD.encode(payload.as_bytes())
        );
        let token = format!("{}.AAAA", token);
        let out = process(JwtDecodeInput {
            token,
            secret: "secret".to_string(),
            secret_encoding: SecretEncoding::Utf8,
        });
        assert!(out.signature_note.contains("asymmetric"));
    }
}
