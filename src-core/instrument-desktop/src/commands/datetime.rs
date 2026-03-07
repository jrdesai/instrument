//! Tauri commands for datetime tools (timestamp converter, timezone converter, etc.).

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
