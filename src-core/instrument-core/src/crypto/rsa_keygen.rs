//! RSA key pair generator — generates RSA-2048/3072/4096 key pairs in PEM format.

use rsa::pkcs1::{EncodeRsaPrivateKey, EncodeRsaPublicKey};
use rsa::pkcs8::{EncodePrivateKey, EncodePublicKey, LineEnding};
use rsa::{RsaPrivateKey, RsaPublicKey};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum RsaKeySize {
    Rsa2048,
    Rsa3072,
    Rsa4096,
}

impl RsaKeySize {
    pub fn bits(self) -> usize {
        match self {
            RsaKeySize::Rsa2048 => 2048,
            RsaKeySize::Rsa3072 => 3072,
            RsaKeySize::Rsa4096 => 4096,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum RsaKeyFormat {
    /// PKCS#8 — -----BEGIN PRIVATE KEY----- / -----BEGIN PUBLIC KEY-----
    Pkcs8,
    /// PKCS#1 — -----BEGIN RSA PRIVATE KEY----- / -----BEGIN RSA PUBLIC KEY-----
    Pkcs1,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RsaKeygenInput {
    pub key_size: RsaKeySize,
    pub format: RsaKeyFormat,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RsaKeygenOutput {
    pub public_key: String,
    pub private_key: String,
    pub algorithm: String,
    pub error: Option<String>,
}

pub fn process(input: RsaKeygenInput) -> RsaKeygenOutput {
    match generate(input.key_size, input.format) {
        Ok((public_key, private_key)) => RsaKeygenOutput {
            public_key,
            private_key,
            algorithm: format!("RSA-{}", input.key_size.bits()),
            error: None,
        },
        Err(e) => RsaKeygenOutput {
            public_key: String::new(),
            private_key: String::new(),
            algorithm: String::new(),
            error: Some(e),
        },
    }
}

fn generate(key_size: RsaKeySize, format: RsaKeyFormat) -> Result<(String, String), String> {
    let mut rng = rand::rngs::OsRng;
    let bits = key_size.bits();

    let private_key = RsaPrivateKey::new(&mut rng, bits)
        .map_err(|e| format!("Key generation failed: {e}"))?;
    let public_key = RsaPublicKey::from(&private_key);

    let (pub_pem, priv_pem) = match format {
        RsaKeyFormat::Pkcs8 => {
            let pub_pem = public_key
                .to_public_key_pem(LineEnding::LF)
                .map_err(|e| format!("Failed to encode public key: {e}"))?;
            let priv_pem = private_key
                .to_pkcs8_pem(LineEnding::LF)
                .map_err(|e| format!("Failed to encode private key: {e}"))?;
            (pub_pem, priv_pem.to_string())
        }
        RsaKeyFormat::Pkcs1 => {
            let pub_pem = public_key
                .to_pkcs1_pem(LineEnding::LF)
                .map_err(|e| format!("Failed to encode public key: {e}"))?;
            let priv_pem = private_key
                .to_pkcs1_pem(LineEnding::LF)
                .map_err(|e| format!("Failed to encode private key: {e}"))?;
            (pub_pem, priv_pem.to_string())
        }
    };

    Ok((pub_pem, priv_pem))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_rsa_2048_pkcs8() {
        let out = process(RsaKeygenInput {
            key_size: RsaKeySize::Rsa2048,
            format: RsaKeyFormat::Pkcs8,
        });
        assert!(out.error.is_none(), "unexpected error: {:?}", out.error);
        assert!(out.public_key.contains("BEGIN PUBLIC KEY"));
        assert!(out.private_key.contains("BEGIN PRIVATE KEY"));
        assert_eq!(out.algorithm, "RSA-2048");
    }

    #[test]
    fn generates_rsa_2048_pkcs1() {
        let out = process(RsaKeygenInput {
            key_size: RsaKeySize::Rsa2048,
            format: RsaKeyFormat::Pkcs1,
        });
        assert!(out.error.is_none(), "unexpected error: {:?}", out.error);
        assert!(out.public_key.contains("BEGIN RSA PUBLIC KEY"));
        assert!(out.private_key.contains("BEGIN RSA PRIVATE KEY"));
    }

    #[test]
    fn each_generation_produces_different_keys() {
        let a = process(RsaKeygenInput {
            key_size: RsaKeySize::Rsa2048,
            format: RsaKeyFormat::Pkcs8,
        });
        let b = process(RsaKeygenInput {
            key_size: RsaKeySize::Rsa2048,
            format: RsaKeyFormat::Pkcs8,
        });
        assert_ne!(a.private_key, b.private_key);
    }
}
