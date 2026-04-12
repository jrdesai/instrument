use clap::{Args, ValueEnum};
use instrument_core::datetime::timestamp::{self as ts, TimestampMode, TimestampUnit};
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
