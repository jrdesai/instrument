//! AES-256-GCM encrypt/decrypt with PBKDF2-SHA256 key derivation (passphrase + random salt).

use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use pbkdf2::pbkdf2_hmac_array;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use sha2::Sha256;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AesInput {
    pub text: String,
    pub passphrase: String,
    /// `"encrypt"` or `"decrypt"`.
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AesOutput {
    pub result: String,
    pub error: Option<String>,
}

const PBKDF2_ITERATIONS: u32 = 300_000;
/// Reject stored iteration counts outside this range (avoids DoS from bogus headers).
const MAX_STORED_PBKDF2_ITERATIONS: u32 = 2_000_000;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;

pub fn process(input: AesInput) -> AesOutput {
    match input.mode.as_str() {
        "encrypt" => encrypt(&input.text, &input.passphrase),
        "decrypt" => decrypt(&input.text, &input.passphrase),
        _ => AesOutput {
            result: String::new(),
            error: Some(format!("Unknown mode: {}", input.mode)),
        },
    }
}

fn derive_key(passphrase: &str, salt: &[u8], iterations: u32) -> [u8; 32] {
    pbkdf2_hmac_array::<Sha256, 32>(passphrase.as_bytes(), salt, iterations)
}

fn encrypt(plaintext: &str, passphrase: &str) -> AesOutput {
    let mut salt = [0u8; SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_bytes);

    let key = derive_key(passphrase, &salt, PBKDF2_ITERATIONS);
    let Ok(cipher) = Aes256Gcm::new_from_slice(&key) else {
        return AesOutput {
            result: String::new(),
            error: Some("Internal error: invalid key length".into()),
        };
    };
    let nonce = Nonce::from_slice(&nonce_bytes);

    match cipher.encrypt(nonce, plaintext.as_bytes()) {
        Ok(ciphertext) => {
            let iter_bytes = PBKDF2_ITERATIONS.to_le_bytes();
            let mut combined = Vec::with_capacity(4 + SALT_LEN + NONCE_LEN + ciphertext.len());
            combined.extend_from_slice(&iter_bytes);
            combined.extend_from_slice(&salt);
            combined.extend_from_slice(&nonce_bytes);
            combined.extend_from_slice(&ciphertext);
            AesOutput {
                result: hex::encode(combined),
                error: None,
            }
        }
        Err(e) => AesOutput {
            result: String::new(),
            error: Some(format!("Encryption failed: {e}")),
        },
    }
}

fn decrypt(hex_input: &str, passphrase: &str) -> AesOutput {
    let bytes = match hex::decode(hex_input.trim()) {
        Ok(b) => b,
        Err(e) => {
            return AesOutput {
                result: String::new(),
                error: Some(format!("Invalid hex: {e}")),
            };
        }
    };

    // New format: iterations (4B LE) || salt (16B) || nonce (12B) || ciphertext
    // Minimum valid length: 4 + 16 + 12 + 16 (GCM tag) = 48 bytes
    if bytes.len() < 4 + SALT_LEN + NONCE_LEN + 16 {
        return AesOutput {
            result: String::new(),
            error: Some(
                "Ciphertext format not recognised — was it encrypted with an older version?"
                    .into(),
            ),
        };
    }

    let iterations = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    if iterations == 0 || iterations > MAX_STORED_PBKDF2_ITERATIONS {
        return AesOutput {
            result: String::new(),
            error: Some(
                "Ciphertext format not recognised — was it encrypted with an older version?"
                    .into(),
            ),
        };
    }

    let salt = &bytes[4..4 + SALT_LEN];
    let nonce_bytes = &bytes[4 + SALT_LEN..4 + SALT_LEN + NONCE_LEN];
    let ciphertext = &bytes[4 + SALT_LEN + NONCE_LEN..];

    let key = derive_key(passphrase, salt, iterations);
    let Ok(cipher) = Aes256Gcm::new_from_slice(&key) else {
        return AesOutput {
            result: String::new(),
            error: Some("Internal error: invalid key length".into()),
        };
    };
    let nonce = Nonce::from_slice(nonce_bytes);

    match cipher.decrypt(nonce, ciphertext.as_ref()) {
        Ok(plaintext) => AesOutput {
            result: String::from_utf8_lossy(&plaintext).into_owned(),
            error: None,
        },
        Err(_) => AesOutput {
            result: String::new(),
            error: Some("Decryption failed — wrong passphrase or corrupted data".into()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip() {
        let secret = "hello world 你好";
        let pass = "correct horse battery staple";
        let enc = encrypt(secret, pass);
        assert!(enc.error.is_none(), "{:?}", enc.error);
        assert!(!enc.result.is_empty());
        let dec = decrypt(&enc.result, pass);
        assert!(dec.error.is_none(), "{:?}", dec.error);
        assert_eq!(dec.result, secret);
    }

    #[test]
    fn wrong_passphrase() {
        let enc = encrypt("data", "good");
        let dec = decrypt(&enc.result, "bad");
        assert!(dec.error.is_some());
        assert!(dec.result.is_empty());
    }
}
