//! Bcrypt password hashing and verification.
//!
//! Module is named `bcrypt_tool` (not `bcrypt`) to avoid ambiguity with the
//! external `bcrypt` crate in import paths.

use bcrypt::{hash, verify};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Cost factor range accepted by the UI (4–31 is the bcrypt spec range;
/// the UI presents 10–13 but the Rust layer clamps to the full valid range).
const MIN_COST: u32 = 4;
const MAX_COST: u32 = 31;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BcryptInput {
    /// `"hash"` or `"verify"`.
    pub mode: String,
    pub password: String,
    /// Cost factor (4–31). Used only in hash mode. UI default is 12.
    pub cost: u32,
    /// Existing bcrypt hash to verify against. Used only in verify mode.
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BcryptOutput {
    /// The generated bcrypt hash. Populated in hash mode; empty string in verify mode.
    pub hash: String,
    /// Whether the password matched the hash. `Some(true/false)` in verify mode; `None` in hash mode.
    pub matches: Option<bool>,
    pub error: Option<String>,
}

pub fn process(input: BcryptInput) -> BcryptOutput {
    let cost = input.cost.clamp(MIN_COST, MAX_COST);
    match input.mode.as_str() {
        "hash" => hash_password(&input.password, cost),
        "verify" => verify_password(&input.password, &input.hash),
        _ => BcryptOutput {
            hash: String::new(),
            matches: None,
            error: Some(format!("Unknown mode: {}", input.mode)),
        },
    }
}

fn hash_password(password: &str, cost: u32) -> BcryptOutput {
    if password.is_empty() {
        return BcryptOutput {
            hash: String::new(),
            matches: None,
            error: Some("Password must not be empty".into()),
        };
    }
    match hash(password, cost) {
        Ok(h) => BcryptOutput {
            hash: h,
            matches: None,
            error: None,
        },
        Err(e) => BcryptOutput {
            hash: String::new(),
            matches: None,
            error: Some(format!("Hashing failed: {e}")),
        },
    }
}

fn verify_password(password: &str, hash_str: &str) -> BcryptOutput {
    if password.is_empty() || hash_str.is_empty() {
        return BcryptOutput {
            hash: String::new(),
            matches: None,
            error: Some("Password and hash must not be empty".into()),
        };
    }
    match verify(password, hash_str) {
        Ok(matched) => BcryptOutput {
            hash: String::new(),
            matches: Some(matched),
            error: None,
        },
        Err(e) => BcryptOutput {
            hash: String::new(),
            matches: None,
            error: Some(format!("Verification failed — check the hash format: {e}")),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_produces_valid_bcrypt_string() {
        let out = process(BcryptInput {
            mode: "hash".into(),
            password: "hunter2".into(),
            cost: 4, // use minimum cost so tests run fast
            hash: String::new(),
        });
        assert!(out.error.is_none(), "unexpected error: {:?}", out.error);
        assert!(
            out.hash.starts_with("$2b$"),
            "expected $2b$ prefix, got: {}",
            out.hash
        );
        assert!(out.matches.is_none());
    }

    #[test]
    fn verify_correct_password() {
        let hashed = process(BcryptInput {
            mode: "hash".into(),
            password: "correct-horse-battery".into(),
            cost: 4,
            hash: String::new(),
        });
        assert!(hashed.error.is_none(), "{:?}", hashed.error);

        let verified = process(BcryptInput {
            mode: "verify".into(),
            password: "correct-horse-battery".into(),
            cost: 4, // ignored in verify mode
            hash: hashed.hash,
        });
        assert!(verified.error.is_none(), "{:?}", verified.error);
        assert_eq!(verified.matches, Some(true));
    }

    #[test]
    fn verify_wrong_password() {
        let hashed = process(BcryptInput {
            mode: "hash".into(),
            password: "correct-horse-battery".into(),
            cost: 4,
            hash: String::new(),
        });

        let verified = process(BcryptInput {
            mode: "verify".into(),
            password: "wrong-horse-battery".into(),
            cost: 4,
            hash: hashed.hash,
        });
        assert!(verified.error.is_none(), "{:?}", verified.error);
        assert_eq!(verified.matches, Some(false));
    }

    #[test]
    fn each_hash_is_different_due_to_random_salt() {
        let a = process(BcryptInput {
            mode: "hash".into(),
            password: "same-password".into(),
            cost: 4,
            hash: String::new(),
        });
        let b = process(BcryptInput {
            mode: "hash".into(),
            password: "same-password".into(),
            cost: 4,
            hash: String::new(),
        });
        assert_ne!(
            a.hash, b.hash,
            "bcrypt should produce a different hash each call due to random salt"
        );
    }

    #[test]
    fn empty_password_returns_error() {
        let out = process(BcryptInput {
            mode: "hash".into(),
            password: String::new(),
            cost: 12,
            hash: String::new(),
        });
        assert!(out.error.is_some());
        assert!(out.hash.is_empty());
    }

    #[test]
    fn unknown_mode_returns_error() {
        let out = process(BcryptInput {
            mode: "encrypt".into(),
            password: "pw".into(),
            cost: 12,
            hash: String::new(),
        });
        assert!(out.error.is_some());
    }
}
