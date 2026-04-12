use clap::{Args, ValueEnum};
use instrument_core::auth::jwt_decoder::{self, SecretEncoding};
use instrument_core::crypto::hash::{self, HashOutputFormat};

use crate::{input, output};

// ── Hash ──────────────────────────────────────────────────────────────────────

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum HashAlgo {
    Md5,
    Sha1,
    Sha256,
    Sha512,
    Sha3256,
    Sha3512,
}

#[derive(Args)]
pub struct HashArgs {
    /// Algorithm to use
    #[arg(value_enum, default_value = "sha256")]
    pub algo: HashAlgo,
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    /// HMAC secret key (enables HMAC mode)
    #[arg(long)]
    pub hmac: Option<String>,
}

fn algo_label(algo: HashAlgo) -> &'static str {
    match algo {
        HashAlgo::Md5 => "MD5",
        HashAlgo::Sha1 => "SHA-1",
        HashAlgo::Sha256 => "SHA-256",
        HashAlgo::Sha512 => "SHA-512",
        HashAlgo::Sha3256 => "SHA3-256",
        HashAlgo::Sha3512 => "SHA3-512",
    }
}

pub fn run_hash(args: HashArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "hash"));
    let hmac_key = args.hmac.unwrap_or_default();
    let out = hash::process(hash::HashInput {
        text: inp,
        hash_empty: false,
        output_format: HashOutputFormat::Hex,
        uppercase: false,
        hmac_key,
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "hash");
    }
    let label = algo_label(args.algo);
    let row = out
        .results
        .iter()
        .find(|r| r.algorithm == label)
        .map(|r| r.value.as_str())
        .unwrap_or("");
    if row.is_empty() {
        output::print_err("No hash result for selected algorithm", json, "hash");
    }
    output::print_ok(row, json, "hash");
}

// ── JWT ───────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct JwtArgs {
    pub token: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
}

pub fn run_jwt(args: JwtArgs, json: bool) {
    let inp = input::resolve(args.token, args.file).unwrap_or_else(|e| output::print_err(&e, json, "jwt"));
    let token = inp.trim().to_string();
    let result = jwt_decoder::process(jwt_decoder::JwtDecodeInput {
        token,
        secret: String::new(),
        secret_encoding: SecretEncoding::Utf8,
    });
    if let Some(e) = result.error {
        output::print_err(&e, json, "jwt");
    }
    if json {
        let header: serde_json::Value =
            serde_json::from_str(&result.header_raw).unwrap_or_else(|_| serde_json::json!(result.header_raw));
        let payload: serde_json::Value =
            serde_json::from_str(&result.payload_raw).unwrap_or_else(|_| serde_json::json!(result.payload_raw));
        let obj = serde_json::json!({
            "ok": true,
            "tool": "jwt",
            "header": header,
            "payload": payload,
            "algorithm": result.algorithm,
            "is_expired": result.is_expired,
        });
        println!("{}", serde_json::to_string_pretty(&obj).unwrap_or_default());
    } else {
        let header_pretty = serde_json::to_string_pretty(
            &serde_json::from_str::<serde_json::Value>(&result.header_raw).unwrap_or(serde_json::Value::Null),
        )
        .unwrap_or_else(|_| result.header_raw.clone());
        let payload_pretty = serde_json::to_string_pretty(
            &serde_json::from_str::<serde_json::Value>(&result.payload_raw).unwrap_or(serde_json::Value::Null),
        )
        .unwrap_or_else(|_| result.payload_raw.clone());
        println!("Header:    {header_pretty}");
        println!("Payload:   {payload_pretty}");
        println!("Algorithm: {}", result.algorithm);
        if result.is_expired == Some(true) {
            eprintln!("warning: token is expired");
        }
    }
}
