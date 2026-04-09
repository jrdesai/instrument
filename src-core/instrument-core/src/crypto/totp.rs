//! TOTP (Time-based One-Time Password) generator.
//!
//! The caller supplies the current Unix timestamp (seconds) so this module
//! is fully deterministic and works in both native and WASM contexts without
//! requiring system-time access.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use totp_rs::{Algorithm, Secret, TOTP};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, Type, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum TotpAlgorithm {
    #[default]
    Sha1,
    Sha256,
    Sha512,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TotpInput {
    /// Base32-encoded TOTP secret (spaces are stripped before parsing).
    pub secret: String,
    /// HMAC algorithm. Default: Sha1.
    pub algorithm: TotpAlgorithm,
    /// Number of digits in the output code (6 or 8). Default: 6.
    pub digits: u32,
    /// Time step in seconds (30 or 60). Default: 30.
    pub period: u32,
    /// Current Unix timestamp in seconds (supplied by the caller — do not use
    /// system time here so WASM works without clock access).
    pub timestamp: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TotpOutput {
    /// The current OTP code (zero-padded to `digits` length).
    pub code: String,
    /// The next OTP code (one period ahead — useful for testing).
    pub next_code: String,
    /// Seconds remaining in the current time window.
    pub valid_for: u32,
    /// Progress through the current window as a value 0.0–1.0 (1.0 = just
    /// started rolling toward expiry, 0.0 = about to expire). Use for the countdown bar.
    pub progress: f64,
    /// Error message if the secret is invalid or generation failed.
    pub error: Option<String>,
}

/// Generate a TOTP code for the given input.
///
/// Never logs the secret or the output code.
pub fn process(input: TotpInput) -> TotpOutput {
    let secret_clean = input.secret.replace(' ', "").to_uppercase();

    if secret_clean.is_empty() {
        let period = input.period.clamp(1, 300);
        return TotpOutput {
            code: String::new(),
            next_code: String::new(),
            valid_for: period,
            progress: 1.0,
            error: None,
        };
    }

    let algorithm = match input.algorithm {
        TotpAlgorithm::Sha1 => Algorithm::SHA1,
        TotpAlgorithm::Sha256 => Algorithm::SHA256,
        TotpAlgorithm::Sha512 => Algorithm::SHA512,
    };

    let digits = input.digits.clamp(6, 8) as usize;
    let period = input.period.clamp(1, 300) as u64;
    let ts = input.timestamp as u64;

    let secret = match Secret::Encoded(secret_clean).to_bytes() {
        Ok(b) => b,
        Err(e) => {
            return TotpOutput {
                code: String::new(),
                next_code: String::new(),
                valid_for: 0,
                progress: 0.0,
                error: Some(format!("Invalid base32 secret: {e}")),
            };
        }
    };

    let totp = match TOTP::new(algorithm, digits, 1, period, secret, None, String::new()) {
        Ok(t) => t,
        Err(e) => {
            return TotpOutput {
                code: String::new(),
                next_code: String::new(),
                valid_for: 0,
                progress: 0.0,
                error: Some(e.to_string()),
            };
        }
    };

    let code = totp.generate(ts);
    let next_code = totp.generate(ts + period);

    let elapsed_in_window = (ts % period) as u32;
    let valid_for = (period as u32).saturating_sub(elapsed_in_window);
    let progress = valid_for as f64 / period as f64;

    TotpOutput {
        code,
        next_code,
        valid_for,
        progress,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 32-char base32 decodes to 20 bytes — satisfies totp-rs minimum secret size.
    const TEST_SECRET: &str = "KRSXG5CTMVRXEZLUKN2XAZLSKNSWG4TFOQ";

    fn run(secret: &str, ts: u32) -> TotpOutput {
        process(TotpInput {
            secret: secret.to_string(),
            algorithm: TotpAlgorithm::Sha1,
            digits: 6,
            period: 30,
            timestamp: ts,
        })
    }

    #[test]
    fn empty_secret_returns_empty_no_error() {
        let out = run("", 1_700_000_000);
        assert_eq!(out.code, "");
        assert!(out.error.is_none());
    }

    #[test]
    fn valid_secret_produces_6_digit_code() {
        let out = run(TEST_SECRET, 1_700_000_000);
        assert!(out.error.is_none(), "unexpected error: {:?}", out.error);
        assert_eq!(out.code.len(), 6, "code should be 6 digits");
        assert!(out.code.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn invalid_base32_returns_error() {
        let out = run("NOT!VALID!BASE32!!!!", 1_700_000_000);
        assert!(out.error.is_some());
        assert_eq!(out.code, "");
    }

    #[test]
    fn spaces_in_secret_are_stripped() {
        let spaced = "KRSXG5CT MVRXEZLUKN2XAZLSKNSWG4TFOQ";
        let nospace = TEST_SECRET;
        let ts = 1_700_000_000_u32;
        assert_eq!(run(spaced, ts).code, run(nospace, ts).code);
    }

    #[test]
    fn valid_for_is_within_period() {
        // 15 seconds elapsed in window => 15 seconds remaining
        let out = run(TEST_SECRET, 1_699_999_995);
        assert!(out.error.is_none());
        assert_eq!(out.valid_for, 15);
        assert!((out.progress - 0.5).abs() < 0.01);
    }

    #[test]
    fn next_code_differs_from_current_at_window_start() {
        let ts = 1_700_000_000_u32;
        let ts_aligned = ts - (ts % 30);
        let out = run(TEST_SECRET, ts_aligned);
        assert!(out.error.is_none());
        assert_ne!(
            out.code, out.next_code,
            "codes for consecutive windows should differ"
        );
    }

    #[test]
    fn eight_digit_code() {
        let out = process(TotpInput {
            secret: TEST_SECRET.to_string(),
            algorithm: TotpAlgorithm::Sha1,
            digits: 8,
            period: 30,
            timestamp: 1_700_000_000,
        });
        assert!(out.error.is_none());
        assert_eq!(out.code.len(), 8);
    }
}
