//! Tauri command wrapper for CSV → JSON conversion.

use std::time::Instant;

use instrument_core::csv::{
    process, process_json_to_csv, CsvToJsonInput, CsvToJsonOutput, JsonToCsvInput, JsonToCsvOutput,
};

use crate::command_log::finish_ok;

/// Runs CSV to JSON conversion via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_csv_to_json(input: CsvToJsonInput) -> CsvToJsonOutput {
    let start = Instant::now();
    let output = process(input);
    finish_ok("tool_csv_to_json", start);
    output
}

/// Runs JSON to CSV conversion via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_json_to_csv(input: JsonToCsvInput) -> JsonToCsvOutput {
    let start = Instant::now();
    let output = process_json_to_csv(input);
    finish_ok("tool_json_to_csv", start);
    output
}
