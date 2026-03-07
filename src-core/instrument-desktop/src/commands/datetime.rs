//! Tauri commands for datetime tools (timestamp, timezone, ISO 8601, etc.).

use instrument_core::datetime::iso8601::{
    process as iso8601_process_core, Iso8601Input, Iso8601Output,
};
use instrument_core::datetime::timestamp::{
    process as timestamp_process_core, TimestampInput, TimestampOutput,
};
use instrument_core::datetime::timezone::{
    process as timezone_process_core, TimezoneInput, TimezoneOutput,
};

/// Runs timestamp conversion via instrument-core.
#[tauri::command]
pub fn timestamp_process(input: TimestampInput) -> TimestampOutput {
    timestamp_process_core(input)
}

/// Runs timezone conversion via instrument-core.
#[tauri::command]
pub fn timezone_process(input: TimezoneInput) -> TimezoneOutput {
    timezone_process_core(input)
}

/// Runs ISO 8601 parse/format via instrument-core.
#[tauri::command]
pub fn iso8601_process(input: Iso8601Input) -> Iso8601Output {
    iso8601_process_core(input)
}
