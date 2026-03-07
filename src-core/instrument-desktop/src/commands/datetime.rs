//! Tauri commands for datetime tools (timestamp converter, etc.).

use instrument_core::datetime::timestamp::{
    process as timestamp_process_core, TimestampInput, TimestampOutput,
};

/// Runs timestamp conversion via instrument-core.
#[tauri::command]
pub fn timestamp_process(input: TimestampInput) -> TimestampOutput {
    timestamp_process_core(input)
}
