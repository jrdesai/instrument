use clap::{Args, ValueEnum};
use instrument_core::datetime::timestamp::{self as ts, TimestampMode, TimestampUnit};
use instrument_core::datetime::{cron, date_calc, iso8601, timezone};
use instrument_core::encoding::{color, qrcode};
use instrument_core::expression;
use instrument_core::network::{self as net, cidr, curl_builder, http_status, mac_address, mime, user_agent};
use instrument_core::numbers::{base_converter, bitwise, chmod, color_contrast, percentage, roman, unit_converter};
use instrument_core::numbers::semver as semver_mod;

use crate::{input, output};

// ── Timestamp ─────────────────────────────────────────────────────────────────

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum TimestampTarget {
    Unix,
    Iso,
    Human,
}

#[derive(Args)]
pub struct TimestampArgs {
    /// Input timestamp (unix seconds, ISO 8601, etc.) — omit or use `now` for current time
    pub value: Option<String>,
    #[arg(long, value_enum, default_value_t = TimestampTarget::Human)]
    pub to: TimestampTarget,
}

pub fn run_timestamp(args: TimestampArgs, json: bool) {
    let raw = args.value.as_deref().unwrap_or("now").trim();
    let (mode, value, unit) = if raw.is_empty() || raw.eq_ignore_ascii_case("now") {
        (TimestampMode::Now, String::new(), TimestampUnit::Seconds)
    } else if raw.chars().all(|c| c.is_ascii_digit()) {
        let unit = if raw.len() >= 13 {
            TimestampUnit::Milliseconds
        } else {
            TimestampUnit::Seconds
        };
        (TimestampMode::ToHuman, raw.to_string(), unit)
    } else {
        (TimestampMode::ToUnix, raw.to_string(), TimestampUnit::Seconds)
    };

    let result = ts::process(ts::TimestampInput {
        value,
        mode,
        unit,
    });
    if let Some(e) = &result.error {
        output::print_err(e, json, "timestamp");
    }
    let out = match args.to {
        TimestampTarget::Unix => result.unix_seconds.to_string(),
        TimestampTarget::Iso => result.iso_8601.clone(),
        TimestampTarget::Human => {
            let rel = result.relative.trim();
            if rel.is_empty() {
                result.iso_8601.clone()
            } else {
                result.relative.clone()
            }
        }
    };
    if out.is_empty() && result.error.is_none() {
        output::print_err("Could not convert timestamp", json, "timestamp");
    }
    output::print_ok(&out, json, "timestamp");
}

// ── Semver ────────────────────────────────────────────────────────────────────

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum SemverAction {
    Parse,
    BumpMajor,
    BumpMinor,
    BumpPatch,
}

#[derive(Args)]
pub struct SemverArgs {
    #[arg(value_enum, default_value_t = SemverAction::Parse)]
    pub action: SemverAction,
    pub version: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
}

pub fn run_semver(args: SemverArgs, json: bool) {
    let inp = input::resolve(args.version, args.file).unwrap_or_else(|e| output::print_err(&e, json, "semver"));
    let result = semver_mod::process(semver_mod::SemverInput {
        version: inp.trim().to_string(),
        compare_with: None,
        range: None,
    });
    if let Some(e) = &result.error {
        output::print_err(e, json, "semver");
    }
    if json {
        let bumped = match args.action {
            SemverAction::Parse => None,
            SemverAction::BumpMajor => result.bumped_major.clone(),
            SemverAction::BumpMinor => result.bumped_minor.clone(),
            SemverAction::BumpPatch => result.bumped_patch.clone(),
        };
        println!(
            "{}",
            serde_json::json!({
                "ok": true, "tool": "semver",
                "result": result.canonical,
                "major": result.major, "minor": result.minor, "patch": result.patch,
                "bumped": bumped,
            })
        );
    } else {
        let line = match args.action {
            SemverAction::Parse => result.canonical.clone(),
            SemverAction::BumpMajor => result
                .bumped_major
                .clone()
                .unwrap_or_else(|| result.canonical.clone()),
            SemverAction::BumpMinor => result
                .bumped_minor
                .clone()
                .unwrap_or_else(|| result.canonical.clone()),
            SemverAction::BumpPatch => result
                .bumped_patch
                .clone()
                .unwrap_or_else(|| result.canonical.clone()),
        };
        println!("{line}");
    }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum DateModeArg {
    Age,
    Duration,
    Add,
    Subtract,
}

#[derive(Args)]
pub struct DateArgs {
    #[arg(long, value_enum)]
    pub mode: DateModeArg,
    #[arg(long = "from")]
    pub from_date: String,
    #[arg(long = "to")]
    pub to_date: Option<String>,
    #[arg(long)]
    pub duration: Option<String>,
}

pub fn run_date(args: DateArgs, json: bool) {
    let (mode, add) = match args.mode {
        DateModeArg::Age => (date_calc::DateCalcMode::Age, None),
        DateModeArg::Duration => (date_calc::DateCalcMode::Duration, None),
        DateModeArg::Add => (date_calc::DateCalcMode::AddSubtract, Some(true)),
        DateModeArg::Subtract => (date_calc::DateCalcMode::AddSubtract, Some(false)),
    };
    let out = date_calc::process(date_calc::DateCalcInput {
        mode,
        date_a: args.from_date,
        date_b: args.to_date,
        duration_str: args.duration,
        add,
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "date");
    }
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"date", "output": out})).unwrap_or_default());
    } else {
        println!("{}", out.result);
    }
}

#[derive(Args)]
pub struct PercentArgs {
    pub a: f64,
    pub b: f64,
}

pub fn run_percent(args: PercentArgs, json: bool) {
    let out = percentage::process(percentage::PercentageInput { a: args.a, b: args.b });
    if let Some(e) = out.error.clone() {
        output::print_err(&e, json, "percent");
    }
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"percent", "output": out})).unwrap_or_default());
    } else {
        println!("a% of b: {}", out.a_pct_of_b);
        println!("a is % of b: {}", out.what_pct_a_of_b);
        println!("b + a%: {}", out.b_plus_a_pct);
        println!("b - a%: {}", out.b_minus_a_pct);
        println!("% change a->b: {}", out.pct_change);
        println!("ratio a:b (%): {}", out.ratio);
    }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum RomanArgMode {
    ToRoman,
    ToArabic,
}

#[derive(Args)]
pub struct RomanArgs {
    pub value: String,
    #[arg(long, value_enum)]
    pub mode: Option<RomanArgMode>,
}

pub fn run_roman(args: RomanArgs, json: bool) {
    let mode = match args.mode {
        Some(RomanArgMode::ToRoman) => roman::RomanMode::ToRoman,
        Some(RomanArgMode::ToArabic) => roman::RomanMode::ToArabic,
        None => {
            if args.value.chars().all(|c| c.is_ascii_digit()) { roman::RomanMode::ToRoman } else { roman::RomanMode::ToArabic }
        }
    };
    let out = roman::process(roman::RomanInput { value: args.value, mode });
    if let Some(e) = out.error.clone() {
        output::print_err(&e, json, "roman");
    }
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"roman", "output": out})).unwrap_or_default());
    } else {
        println!("{}", out.result);
    }
}

#[derive(Args)]
pub struct MimeArgs {
    pub value: String,
}

pub fn run_mime(args: MimeArgs, json: bool) {
    let out = mime::process(mime::MimeInput { value: args.value });
    if let Some(e) = out.error.clone() {
        output::print_err(&e, json, "mime");
    }
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"mime", "output": out})).unwrap_or_default());
    } else if !out.mime_types.is_empty() {
        println!("{}", out.mime_types.join("\n"));
    } else {
        println!("{}", out.extensions.join("\n"));
    }
}

#[derive(Args)]
pub struct HttpStatusArgs {
    pub value: String,
}

pub fn run_http_status(args: HttpStatusArgs, json: bool) {
    let out = http_status::process(http_status::HttpStatusInput { value: args.value });
    if let Some(e) = out.error.clone() {
        output::print_err(&e, json, "http-status");
    }
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"http-status", "output": out})).unwrap_or_default());
    } else {
        for item in out.matches {
            println!("{}  {}  —  {}", item.code, item.name, item.description);
        }
    }
}

#[derive(Args)]
pub struct MacArgs {
    pub address: Option<String>,
    #[arg(long)]
    pub generate: bool,
}

pub fn run_mac(args: MacArgs, json: bool) {
    let out = mac_address::process(mac_address::MacInput { value: args.address.unwrap_or_default(), generate: args.generate });
    if let Some(e) = out.error.clone() {
        output::print_err(&e, json, "mac");
    }
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"mac", "output": out})).unwrap_or_default());
    } else {
        println!("hex: {}", out.hex);
        println!("colon: {}", out.colon);
        println!("dash: {}", out.dash);
        println!("dot: {}", out.dot);
        println!("oui: {}", out.oui);
        println!("transmission: {}", out.transmission);
        println!("scope: {}", out.scope);
    }
}

#[derive(Args)]
pub struct CurlBuildArgs {
    #[arg(long)]
    pub url: String,
    #[arg(long, default_value = "GET")]
    pub method: String,
    #[arg(long = "header")]
    pub headers: Vec<String>,
    #[arg(long = "param")]
    pub params: Vec<String>,
    #[arg(long = "data")]
    pub body: Option<String>,
    #[arg(long = "content-type")]
    pub content_type: Option<String>,
    #[arg(long)]
    pub bearer: Option<String>,
    #[arg(long)]
    pub basic: Option<String>,
    #[arg(long = "follow-redirects")]
    pub follow_redirects: bool,
    #[arg(long)]
    pub insecure: bool,
    #[arg(long)]
    pub verbose: bool,
}

pub fn run_curl_build(args: CurlBuildArgs, json: bool) {
    let headers = args.headers.iter().filter_map(|h| h.split_once(": ").or_else(|| h.split_once(':'))).map(|(k,v)| curl_builder::CurlHeader{key:k.to_string(), value:v.to_string()}).collect::<Vec<_>>();
    let params = args.params.iter().filter_map(|p| p.split_once('=')).map(|(k,v)| curl_builder::CurlParam{key:k.to_string(), value:v.to_string()}).collect::<Vec<_>>();
    let auth = if let Some(bearer) = args.bearer { Some(format!("bearer:{bearer}")) } else { args.basic.map(|v| format!("basic:{v}")) };
    let out = curl_builder::process(curl_builder::CurlBuildInput {
        url: args.url,
        method: args.method,
        headers,
        params,
        body: args.body,
        content_type: args.content_type,
        auth,
        follow_redirects: args.follow_redirects,
        insecure: args.insecure,
        verbose: args.verbose,
    });
    if let Some(e) = out.error {
        output::print_err(&e, json, "curl-build");
    }
    output::print_ok(&out.command, json, "curl-build");
}

#[derive(Args)]
pub struct ChmodArgs { pub value: String }
pub fn run_chmod(args: ChmodArgs, json: bool) {
    let out = chmod::process(chmod::ChmodInput { value: args.value });
    if let Some(e) = out.error { output::print_err(&e, json, "chmod"); }
    output::print_ok(&out.octal, json, "chmod");
}

#[derive(Args)]
pub struct TimezoneArgs { #[arg(long)] pub datetime: String, #[arg(long)] pub from: String, #[arg(long)] pub to: String }
pub fn run_timezone(args: TimezoneArgs, json: bool) {
    let out = timezone::process(timezone::TimezoneInput { datetime: args.datetime, from_tz: args.from, to_tz: args.to });
    if let Some(e) = out.error { output::print_err(&e, json, "timezone"); }
    output::print_ok(&out.result_iso, json, "timezone");
}

#[derive(Args)]
pub struct Iso8601Args { pub value: String }
pub fn run_iso8601(args: Iso8601Args, json: bool) {
    let out = iso8601::process(iso8601::Iso8601Input { value: args.value });
    if let Some(e) = out.error { output::print_err(&e, json, "iso8601"); }
    output::print_ok(out.as_utc.as_deref().unwrap_or(""), json, "iso8601");
}

#[derive(Args)]
pub struct CronArgs { pub expression: String, #[arg(long)] pub count: Option<u32> }
pub fn run_cron(args: CronArgs, json: bool) {
    let out = cron::process(cron::CronInput { expression: args.expression, count: args.count });
    if let Some(e) = out.error { output::print_err(&e, json, "cron"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"cron", "output": out})); } else { println!("{}", out.description); }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum BaseArg { Decimal, Hexadecimal, Binary, Octal, Base32, Base36 }
#[derive(Args)]
pub struct BaseArgs { pub value: String, #[arg(long, value_enum)] pub from: BaseArg }
pub fn run_base(args: BaseArgs, json: bool) {
    let from_base = match args.from { BaseArg::Decimal => base_converter::NumberBase::Decimal, BaseArg::Hexadecimal => base_converter::NumberBase::Hexadecimal, BaseArg::Binary => base_converter::NumberBase::Binary, BaseArg::Octal => base_converter::NumberBase::Octal, BaseArg::Base32 => base_converter::NumberBase::Base32, BaseArg::Base36 => base_converter::NumberBase::Base36 };
    let out = base_converter::process(base_converter::BaseConverterInput { value: args.value, from_base, bit_width: base_converter::BitWidth::Auto, uppercase_hex: false });
    if let Some(e) = out.error { output::print_err(&e, json, "base"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"base", "output": out})); } else { println!("dec={} hex={} bin={}", out.decimal, out.hexadecimal, out.binary); }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum UnitCategoryArg { DataSize, Time, Temperature, Length, Weight, Speed, Angle, Frequency }
#[derive(Args)]
pub struct UnitArgs { pub value: f64, #[arg(long)] pub from: String, #[arg(long, value_enum)] pub category: UnitCategoryArg }
pub fn run_unit(args: UnitArgs, json: bool) {
    let category = match args.category { UnitCategoryArg::DataSize => unit_converter::UnitCategory::DataSize, UnitCategoryArg::Time => unit_converter::UnitCategory::Time, UnitCategoryArg::Temperature => unit_converter::UnitCategory::Temperature, UnitCategoryArg::Length => unit_converter::UnitCategory::Length, UnitCategoryArg::Weight => unit_converter::UnitCategory::Weight, UnitCategoryArg::Speed => unit_converter::UnitCategory::Speed, UnitCategoryArg::Angle => unit_converter::UnitCategory::Angle, UnitCategoryArg::Frequency => unit_converter::UnitCategory::Frequency };
    let out = unit_converter::process(unit_converter::UnitConverterInput { value: args.value, from_unit: args.from, category });
    if let Some(e) = out.error { output::print_err(&e, json, "unit"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"unit", "output": out.results})); } else { for r in out.results { println!("{}={}", r.unit, r.formatted); } }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum BitBaseArg { Decimal, Hexadecimal, Binary, Octal }
#[derive(Args)]
pub struct BitwiseArgs { pub a: String, #[arg(long)] pub b: Option<String>, #[arg(long, value_enum, default_value_t = BitBaseArg::Decimal)] pub base: BitBaseArg }
pub fn run_bitwise(args: BitwiseArgs, json: bool) {
    let from_base = match args.base { BitBaseArg::Decimal => bitwise::BitwiseBase::Decimal, BitBaseArg::Hexadecimal => bitwise::BitwiseBase::Hexadecimal, BitBaseArg::Binary => bitwise::BitwiseBase::Binary, BitBaseArg::Octal => bitwise::BitwiseBase::Octal };
    let out = bitwise::process(bitwise::BitwiseInput { value_a: args.a, value_b: args.b.unwrap_or_default(), from_base, bit_width: bitwise::BitwiseWidth::Bit32, shift_amount: 1 });
    if let Some(e) = out.error { output::print_err(&e, json, "bitwise"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"bitwise", "output": out})); } else if let Some(and) = out.and { println!("and={}", and.decimal); }
}

#[derive(Args)]
pub struct EvalArgs { pub expr: String }
pub fn run_eval(args: EvalArgs, json: bool) {
    let out = expression::process(expression::ExprEvalInput { expression: args.expr });
    if let Some(e) = out.error { output::print_err(&e, json, "eval"); }
    output::print_ok(&out.result, json, "eval");
}

#[derive(Args)]
pub struct ContrastArgs { pub foreground: String, pub background: String }
pub fn run_contrast(args: ContrastArgs, json: bool) {
    let out = color_contrast::process(color_contrast::ColorContrastInput { foreground: args.foreground, background: args.background });
    if let Some(e) = out.error { output::print_err(&e, json, "contrast"); }
    output::print_ok(&out.ratio_display, json, "contrast");
}

#[derive(Args)]
pub struct UrlParseArgs { pub value: String }
pub fn run_url_parse(args: UrlParseArgs, json: bool) {
    let out = net::process(net::UrlParseInput { value: args.value });
    if let Some(e) = out.error.clone() { output::print_err(&e, json, "url-parse"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"url-parse", "output": out})); } else { println!("{}", out.host.unwrap_or_default()); }
}

#[derive(Args)]
pub struct UserAgentArgs { pub ua: String }
pub fn run_user_agent(args: UserAgentArgs, json: bool) {
    let out = user_agent::process(user_agent::UaParseInput { ua: args.ua });
    if let Some(e) = out.error.clone() { output::print_err(&e, json, "user-agent"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"user-agent", "output": out})); } else { println!("{}", out.browser_name.unwrap_or_default()); }
}

#[derive(Args)]
pub struct CidrArgs { pub cidr: String }
pub fn run_cidr(args: CidrArgs, json: bool) {
    let out = cidr::process(cidr::CidrInput { cidr: args.cidr });
    if let Some(e) = out.error { output::print_err(&e, json, "cidr"); }
    output::print_ok(&out.network_address, json, "cidr");
}

#[derive(Args)]
pub struct ColorArgs { pub value: String }
pub fn run_color(args: ColorArgs, json: bool) {
    let out = color::process(color::ColorInput { value: args.value });
    if let Some(e) = out.error { output::print_err(&e, json, "color"); }
    output::print_ok(&out.hex, json, "color");
}

#[derive(Args)]
pub struct QrArgs { pub text: String }
pub fn run_qr(args: QrArgs, json: bool) {
    let out = qrcode::process(qrcode::QrCodeInput { text: args.text, ec_level: qrcode::QrEcLevel::Medium, module_size: 8, fg_color: "#000000".to_string(), bg_color: "#ffffff".to_string(), margin: 4 });
    if let Some(e) = out.error { output::print_err(&e, json, "qr"); }
    output::print_ok(&out.svg, json, "qr");
}
