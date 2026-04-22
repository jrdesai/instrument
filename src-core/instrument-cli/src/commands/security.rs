use clap::{Args, Subcommand, ValueEnum};
use instrument_core::auth::jwt_decoder::{self, SecretEncoding};
use instrument_core::crypto::{bcrypt_tool, cert};
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

#[derive(Args)]
pub struct BcryptArgs {
    #[command(subcommand)]
    pub mode: BcryptMode,
}

#[derive(Subcommand)]
pub enum BcryptMode {
    Hash {
        password: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
        #[arg(long, default_value_t = 12)]
        cost: u32,
    },
    Verify {
        password: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
        #[arg(long)]
        hash: String,
    },
}

pub fn run_bcrypt(args: BcryptArgs, json: bool) {
    match args.mode {
        BcryptMode::Hash { password, file, cost } => {
            let password = input::resolve(password, file).unwrap_or_else(|e| output::print_err(&e, json, "bcrypt"));
            let out = bcrypt_tool::process(bcrypt_tool::BcryptInput { mode: "hash".to_string(), password, cost, hash: String::new() });
            if let Some(e) = out.error {
                output::print_err(&e, json, "bcrypt");
            }
            output::print_ok(&out.hash, json, "bcrypt");
        }
        BcryptMode::Verify { password, file, hash } => {
            let password = input::resolve(password, file).unwrap_or_else(|e| output::print_err(&e, json, "bcrypt"));
            let out = bcrypt_tool::process(bcrypt_tool::BcryptInput { mode: "verify".to_string(), password, cost: 12, hash });
            if let Some(e) = out.error {
                output::print_err(&e, json, "bcrypt");
            }
            let valid = out.matches.unwrap_or(false);
            if json {
                println!("{}", serde_json::json!({"ok": true, "tool": "bcrypt", "valid": valid}));
            } else {
                println!("{}", if valid { "Valid" } else { "Invalid" });
            }
        }
    }
}

#[derive(Args)]
pub struct CertArgs {
    pub pem: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
}

pub fn run_cert(args: CertArgs, json: bool) {
    let pem = input::resolve(args.pem, args.file).unwrap_or_else(|e| output::print_err(&e, json, "cert"));
    let out = cert::process(cert::CertDecodeInput { pem });
    if let Some(e) = out.error.clone() {
        output::print_err(&e, json, "cert");
    }
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"cert", "output": out})).unwrap_or_default());
    } else {
        for c in out.certificates {
            println!("subject: {}", c.subject);
            println!("issuer: {}", c.issuer);
            println!("not_before: {}", c.not_before);
            println!("not_after: {}", c.not_after);
            if !c.sans.is_empty() {
                println!("sans: {}", c.sans.join(", "));
            }
            println!("sha256: {}", c.fingerprint_sha256);
        }
    }
}
