//! Tauri commands for datetime tools (timestamp, timezone, ISO 8601, etc.).

use std::time::Instant;

use instrument_core::datetime::cron::{process as cron_process_core, CronInput, CronOutput};
use instrument_core::datetime::iso8601::{
    process as iso8601_process_core, Iso8601Input, Iso8601Output,
};
use instrument_core::datetime::timestamp::{
    process as timestamp_process_core, TimestampInput, TimestampOutput,
};
use instrument_core::datetime::timezone::{
    process as timezone_process_core, TimezoneInput, TimezoneOutput,
};

use crate::command_log::finish_ok;

/// Runs timestamp conversion via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_timestamp_process(input: TimestampInput) -> TimestampOutput {
    let start = Instant::now();
    let output = timestamp_process_core(input);
    finish_ok("tool_timestamp_process", start);
    output
}

/// Runs timezone conversion via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_timezone_process(input: TimezoneInput) -> TimezoneOutput {
    let start = Instant::now();
    let output = timezone_process_core(input);
    finish_ok("tool_timezone_process", start);
    output
}

/// Runs ISO 8601 parse/format via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_iso8601_process(input: Iso8601Input) -> Iso8601Output {
    let start = Instant::now();
    let output = iso8601_process_core(input);
    finish_ok("tool_iso8601_process", start);
    output
}

/// Parses a cron expression and returns next run times (UTC).
#[tauri::command]
#[specta::specta]
pub fn tool_cron_process(input: CronInput) -> CronOutput {
    let start = Instant::now();
    let output = cron_process_core(input);
    finish_ok("tool_cron_process", start);
    output
}
