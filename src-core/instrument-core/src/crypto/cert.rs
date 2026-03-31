//! X.509 / PEM certificate decoder.

use base64::Engine as _;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use x509_parser::prelude::*;
use x509_parser::public_key::PublicKey;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CertDecodeInput {
    /// PEM-encoded certificate (one or chain).
    pub pem: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DnField {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CertInfo {
    pub subject: String,
    pub subject_fields: Vec<DnField>,
    pub issuer: String,
    pub issuer_fields: Vec<DnField>,
    pub serial_number: String,
    pub not_before: String,
    pub not_after: String,
    pub is_expired: bool,
    pub expiry_warning: bool,
    pub days_until_expiry: i64,
    pub signature_algorithm: String,
    pub public_key_algorithm: String,
    pub public_key_size: Option<u32>,
    pub sans: Vec<String>,
    pub is_ca: bool,
    pub key_usages: Vec<String>,
    pub extended_key_usages: Vec<String>,
    pub fingerprint_sha256: String,
    pub version: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CertDecodeOutput {
    pub certificates: Vec<CertInfo>,
    pub error: Option<String>,
}

pub fn process(input: CertDecodeInput) -> CertDecodeOutput {
    let pem_data = input.pem.trim();
    if pem_data.is_empty() {
        return CertDecodeOutput {
            certificates: vec![],
            error: None,
        };
    }

    // Try DER path first if no PEM header found.
    if !pem_data.contains("-----BEGIN") {
        let cleaned: String = pem_data.chars().filter(|c| !c.is_whitespace()).collect();
        if let Ok(der_bytes) = base64::engine::general_purpose::STANDARD.decode(&cleaned) {
            match parse_x509_certificate(&der_bytes) {
                Ok((_, cert)) => {
                    return CertDecodeOutput {
                        certificates: vec![extract_cert_info(&cert, &der_bytes)],
                        error: None,
                    };
                }
                Err(e) => {
                    return CertDecodeOutput {
                        certificates: vec![],
                        error: Some(format!("Failed to parse DER certificate: {e}")),
                    };
                }
            }
        }
    }

    let mut certs = Vec::new();
    let mut remaining = pem_data.as_bytes();

    while let Ok((rest, pem)) = parse_x509_pem(remaining) {
        match parse_x509_certificate(&pem.contents) {
            Ok((_, cert)) => {
                certs.push(extract_cert_info(&cert, &pem.contents));
                remaining = rest;
                if rest.is_empty() {
                    break;
                }
            }
            Err(e) => {
                return CertDecodeOutput {
                    certificates: certs,
                    error: Some(format!("Failed to parse certificate: {e}")),
                }
            }
        }
    }

    if certs.is_empty() {
        return CertDecodeOutput {
            certificates: vec![],
            error: Some("No valid X.509 certificates found in input".to_string()),
        };
    }

    // Sort: leaf first, then intermediates/root.
    certs.sort_by_key(|c| if c.is_ca { 1 } else { 0 });

    CertDecodeOutput {
        certificates: certs,
        error: None,
    }
}

fn parse_dn(dn_str: &str) -> Vec<DnField> {
    dn_str
        .split(", ")
        .filter_map(|part| {
            let mut kv = part.splitn(2, '=');
            let label = kv.next()?.trim().to_uppercase();
            let value = kv.next()?.trim().to_string();
            Some(DnField { label, value })
        })
        .collect()
}

fn extract_cert_info(cert: &X509Certificate, raw: &[u8]) -> CertInfo {
    use sha2::{Digest, Sha256};

    let subject = cert.subject().to_string();
    let subject_fields = parse_dn(&subject);
    let issuer = cert.issuer().to_string();
    let issuer_fields = parse_dn(&issuer);
    let serial = cert.raw_serial_as_string();

    let not_before = cert.validity().not_before.to_rfc2822().unwrap_or_default();
    let not_after = cert.validity().not_after.to_rfc2822().unwrap_or_default();

    let now = ASN1Time::now();
    let is_expired = cert.validity().not_after < now;
    let days_until_expiry = (cert.validity().not_after.timestamp() - now.timestamp()) / 86_400;
    let expiry_warning = !is_expired && days_until_expiry >= 0 && days_until_expiry <= 30;

    let sig_alg = cert.signature_algorithm.algorithm.to_string();
    let (pk_alg, pk_size) = match cert.public_key().parsed() {
        Ok(PublicKey::RSA(rsa)) => ("RSA".to_string(), Some(rsa.key_size() as u32)),
        Ok(PublicKey::EC(_)) => ("EC (Elliptic Curve)".to_string(), None),
        Ok(PublicKey::DSA(_)) => ("DSA".to_string(), None),
        _ => (cert.public_key().algorithm.algorithm.to_string(), None),
    };

    let mut sans = Vec::new();
    if let Ok(Some(san_ext)) = cert.subject_alternative_name() {
        for name in &san_ext.value.general_names {
            sans.push(name.to_string());
        }
    }

    let is_ca = cert.is_ca();

    let mut key_usages = Vec::new();
    if let Ok(Some(ku)) = cert.key_usage() {
        let u = &ku.value;
        if u.digital_signature() {
            key_usages.push("Digital Signature".to_string());
        }
        if u.key_cert_sign() {
            key_usages.push("Certificate Sign".to_string());
        }
        if u.crl_sign() {
            key_usages.push("CRL Sign".to_string());
        }
        if u.key_encipherment() {
            key_usages.push("Key Encipherment".to_string());
        }
        if u.data_encipherment() {
            key_usages.push("Data Encipherment".to_string());
        }
    }

    let mut extended_key_usages = Vec::new();
    if let Ok(Some(ext_ku)) = cert.extended_key_usage() {
        let e = &ext_ku.value;
        if e.server_auth {
            extended_key_usages.push("TLS Web Server Authentication".to_string());
        }
        if e.client_auth {
            extended_key_usages.push("TLS Web Client Authentication".to_string());
        }
        if e.code_signing {
            extended_key_usages.push("Code Signing".to_string());
        }
        if e.email_protection {
            extended_key_usages.push("Email Protection".to_string());
        }
        if e.time_stamping {
            extended_key_usages.push("Time Stamping".to_string());
        }
    }

    let mut hasher = Sha256::new();
    hasher.update(raw);
    let fingerprint_sha256 = hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02X}"))
        .collect::<Vec<_>>()
        .join(":");

    CertInfo {
        subject,
        subject_fields,
        issuer,
        issuer_fields,
        serial_number: serial,
        not_before,
        not_after,
        is_expired,
        expiry_warning,
        days_until_expiry,
        signature_algorithm: sig_alg,
        public_key_algorithm: pk_alg,
        public_key_size: pk_size,
        sans,
        is_ca,
        key_usages,
        extended_key_usages,
        fingerprint_sha256,
        version: cert.version().0 + 1,
    }
}
