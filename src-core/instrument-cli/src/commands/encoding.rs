use clap::{Args, Subcommand};
use instrument_core::encoding::{
    base64 as b64,
    hex as hex_mod,
    html_entity,
    url::{process as url_process, UrlEncodeInput, UrlEncodeMode, UrlEncodeType},
};
use instrument_core::text::slug;

use crate::{input, output};

// ── Base64 ────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct Base64Args {
    #[command(subcommand)]
    pub mode: Base64Mode,
}

#[derive(Subcommand)]
pub enum Base64Mode {
    /// Encode text to Base64
    Encode {
        text: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
        #[arg(long)]
        url_safe: bool,
    },
    /// Decode Base64 to text
    Decode {
        text: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
        #[arg(long)]
        url_safe: bool,
    },
}

pub fn run_base64(args: Base64Args, json: bool) {
    match args.mode {
        Base64Mode::Encode {
            text,
            file,
            url_safe,
        } => {
            let inp = input::resolve(text, file).unwrap_or_else(|e| output::print_err(&e, json, "base64"));
            let result = b64::process(b64::Base64Input {
                text: inp,
                mode: b64::Base64Mode::Encode,
                url_safe,
            });
            match result.error {
                Some(e) => output::print_err(&e, json, "base64"),
                None => output::print_ok(&result.result, json, "base64"),
            }
        }
        Base64Mode::Decode {
            text,
            file,
            url_safe,
        } => {
            let inp = input::resolve(text, file).unwrap_or_else(|e| output::print_err(&e, json, "base64"));
            let result = b64::process(b64::Base64Input {
                text: inp,
                mode: b64::Base64Mode::Decode,
                url_safe,
            });
            match result.error {
                Some(e) => output::print_err(&e, json, "base64"),
                None => output::print_ok(&result.result, json, "base64"),
            }
        }
    }
}

// ── URL ───────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct UrlArgs {
    #[command(subcommand)]
    pub mode: UrlMode,
}

#[derive(Subcommand)]
pub enum UrlMode {
    Encode {
        text: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
    },
    Decode {
        text: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
    },
}

pub fn run_url(args: UrlArgs, json: bool) {
    match args.mode {
        UrlMode::Encode { text, file } => {
            let inp = input::resolve(text, file).unwrap_or_else(|e| output::print_err(&e, json, "url"));
            let result = url_process(UrlEncodeInput {
                text: inp,
                mode: UrlEncodeMode::Encode,
                encode_type: UrlEncodeType::Full,
            });
            if let Some(e) = result.error {
                output::print_err(&e, json, "url");
            }
            output::print_ok(&result.result, json, "url");
        }
        UrlMode::Decode { text, file } => {
            let inp = input::resolve(text, file).unwrap_or_else(|e| output::print_err(&e, json, "url"));
            let result = url_process(UrlEncodeInput {
                text: inp,
                mode: UrlEncodeMode::Decode,
                encode_type: UrlEncodeType::Full,
            });
            if let Some(e) = result.error {
                output::print_err(&e, json, "url");
            }
            output::print_ok(&result.result, json, "url");
        }
    }
}

// ── Hex ───────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct HexArgs {
    #[command(subcommand)]
    pub mode: HexMode,
}

#[derive(Subcommand)]
pub enum HexMode {
    Encode {
        text: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
    },
    Decode {
        text: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
    },
}

pub fn run_hex(args: HexArgs, json: bool) {
    match args.mode {
        HexMode::Encode { text, file } => {
            let inp = input::resolve(text, file).unwrap_or_else(|e| output::print_err(&e, json, "hex"));
            let result = hex_mod::process(hex_mod::HexInput {
                text: inp,
                mode: hex_mod::HexMode::TextToHex,
                separator: hex_mod::HexSeparator::Space,
            });
            match result.error {
                Some(e) => output::print_err(&e, json, "hex"),
                None => output::print_ok(&result.result, json, "hex"),
            }
        }
        HexMode::Decode { text, file } => {
            let inp = input::resolve(text, file).unwrap_or_else(|e| output::print_err(&e, json, "hex"));
            let result = hex_mod::process(hex_mod::HexInput {
                text: inp,
                mode: hex_mod::HexMode::HexToText,
                separator: hex_mod::HexSeparator::None,
            });
            match result.error {
                Some(e) => output::print_err(&e, json, "hex"),
                None => output::print_ok(&result.result, json, "hex"),
            }
        }
    }
}

// ── HTML Entity ───────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct HtmlEntityArgs {
    #[command(subcommand)]
    pub mode: HtmlEntityMode,
}

#[derive(Subcommand)]
pub enum HtmlEntityMode {
    Encode {
        text: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
    },
    Decode {
        text: Option<String>,
        #[arg(short, long)]
        file: Option<std::path::PathBuf>,
    },
}

pub fn run_html_entity(args: HtmlEntityArgs, json: bool) {
    match args.mode {
        HtmlEntityMode::Encode { text, file } => {
            let inp = input::resolve(text, file).unwrap_or_else(|e| output::print_err(&e, json, "html-entity"));
            let result = html_entity::process(html_entity::HtmlEntityInput {
                text: inp,
                mode: html_entity::HtmlEntityMode::Encode,
                encode_type: html_entity::HtmlEntityEncodeType::Named,
            });
            if let Some(e) = result.error {
                output::print_err(&e, json, "html-entity");
            }
            output::print_ok(&result.result, json, "html-entity");
        }
        HtmlEntityMode::Decode { text, file } => {
            let inp = input::resolve(text, file).unwrap_or_else(|e| output::print_err(&e, json, "html-entity"));
            let result = html_entity::process(html_entity::HtmlEntityInput {
                text: inp,
                mode: html_entity::HtmlEntityMode::Decode,
                encode_type: html_entity::HtmlEntityEncodeType::Named,
            });
            if let Some(e) = result.error {
                output::print_err(&e, json, "html-entity");
            }
            output::print_ok(&result.result, json, "html-entity");
        }
    }
}

// ── Slug ─────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct SlugArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    #[arg(long, default_value = "-")]
    pub separator: String,
    #[arg(long)]
    pub no_lowercase: bool,
    #[arg(long)]
    pub max_length: Option<u32>,
}

pub fn run_slug(args: SlugArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "slug"));
    let result = slug::process(slug::SlugInput {
        text: inp,
        separator: args.separator,
        lowercase: !args.no_lowercase,
        max_length: args.max_length,
    });
    if let Some(e) = result.error {
        output::print_err(&e, json, "slug");
    }
    output::print_ok(&result.slug, json, "slug");
}
