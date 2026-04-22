use clap::Args;
use instrument_core::crypto::{api_key, nanoid as nanoid_mod, passphrase, password as pw_mod, ulid as ulid_mod, uuid_gen};

use crate::output;

// ── UUID ──────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct UuidArgs {
    /// Version: v4 (random) or v7 (time-ordered)
    #[arg(default_value = "v4")]
    pub version: String,
    #[arg(short = 'n', long, default_value_t = 1)]
    pub count: usize,
}

pub fn run_uuid(args: UuidArgs, json: bool) {
    let version = if args.version.eq_ignore_ascii_case("v7") {
        uuid_gen::UuidVersion::V7
    } else {
        uuid_gen::UuidVersion::V4
    };
    let count = args.count.min(100) as u32;
    let out = uuid_gen::process(uuid_gen::UuidInput {
        version,
        count,
        uppercase: false,
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "uuid");
    }
    if json {
        println!("{}", serde_json::json!({ "ok": true, "tool": "uuid", "output": out.uuids }));
    } else {
        println!("{}", out.uuids.join("\n"));
    }
}

// ── ULID ──────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct UlidArgs {
    #[arg(short = 'n', long, default_value_t = 1)]
    pub count: usize,
}

pub fn run_ulid(args: UlidArgs, json: bool) {
    let count = args.count.min(100) as u32;
    let out = ulid_mod::process(ulid_mod::UlidInput {
        count,
        uppercase: false,
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "ulid");
    }
    if json {
        println!("{}", serde_json::json!({ "ok": true, "tool": "ulid", "output": out.ulids }));
    } else {
        println!("{}", out.ulids.join("\n"));
    }
}

// ── Nano ID ───────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct NanoidArgs {
    #[arg(short, long, default_value_t = 21)]
    pub length: u32,
    #[arg(long)]
    pub alphabet: Option<String>,
    #[arg(short = 'n', long, default_value_t = 1)]
    pub count: usize,
}

pub fn run_nanoid(args: NanoidArgs, json: bool) {
    let count = args.count.min(100) as u32;
    let out = nanoid_mod::process(nanoid_mod::NanoIdInput {
        count,
        size: args.length,
        alphabet: args.alphabet.clone(),
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "nanoid");
    }
    if json {
        println!("{}", serde_json::json!({ "ok": true, "tool": "nanoid", "output": out.ids }));
    } else {
        println!("{}", out.ids.join("\n"));
    }
}

// ── Password ──────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct PasswordArgs {
    #[arg(short, long, default_value_t = 20)]
    pub length: u32,
    #[arg(long)]
    pub no_symbols: bool,
    #[arg(long)]
    pub no_numbers: bool,
    #[arg(long)]
    pub no_uppercase: bool,
    #[arg(long)]
    pub no_lowercase: bool,
    #[arg(short = 'n', long, default_value_t = 1)]
    pub count: usize,
}

pub fn run_password(args: PasswordArgs, json: bool) {
    let count = args.count.min(50) as u32;
    let out = pw_mod::process(pw_mod::PasswordInput {
        length: args.length,
        count,
        include_uppercase: !args.no_uppercase,
        include_lowercase: !args.no_lowercase,
        include_numbers: !args.no_numbers,
        include_symbols: !args.no_symbols,
        exclude_ambiguous: false,
        symbols: String::new(),
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "password");
    }
    if json {
        println!("{}", serde_json::json!({ "ok": true, "tool": "password", "output": out.passwords }));
    } else {
        println!("{}", out.passwords.join("\n"));
    }
}

#[derive(Args)]
pub struct ApiKeyArgs {
    #[arg(long, default_value_t = 32)]
    pub length: u32,
    #[arg(long)]
    pub prefix: Option<String>,
}

pub fn run_api_key(args: ApiKeyArgs, json: bool) {
    let has_prefix = args.prefix.is_some();
    let out = api_key::process(api_key::ApiKeyInput {
        count: 1,
        length: args.length,
        prefix: args.prefix.unwrap_or_default(),
        format: if has_prefix {
            api_key::ApiKeyFormat::Prefixed
        } else {
            api_key::ApiKeyFormat::Raw
        },
        charset: api_key::ApiKeyCharset::Alphanumeric,
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "api-key");
    }
    output::print_ok(out.keys.first().map(String::as_str).unwrap_or(""), json, "api-key");
}

#[derive(Args)]
pub struct PassphraseArgs {
    #[arg(long, default_value_t = 4)]
    pub words: u32,
    #[arg(long, default_value = "-")]
    pub separator: String,
    #[arg(long, default_value_t = 1)]
    pub count: u32,
}

pub fn run_passphrase(args: PassphraseArgs, json: bool) {
    let separator = match args.separator.as_str() {
        " " => passphrase::PassphraseSeparator::Space,
        "." => passphrase::PassphraseSeparator::Dot,
        "_" => passphrase::PassphraseSeparator::Underscore,
        "" => passphrase::PassphraseSeparator::None,
        _ => passphrase::PassphraseSeparator::Hyphen,
    };
    let out = passphrase::process(passphrase::PassphraseInput {
        word_count: args.words,
        count: args.count,
        separator,
        capitalize: false,
        include_number: false,
        include_symbol: false,
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "passphrase");
    }
    if json {
        println!("{}", serde_json::json!({"ok": true, "tool": "passphrase", "output": out.passphrases}));
    } else {
        println!("{}", out.passphrases.join("\n"));
    }
}
