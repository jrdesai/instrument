//! Tauri command wrapper for CSV → JSON conversion.

use instrument_core::csv::{process, CsvToJsonInput, CsvToJsonOutput};

/// Runs CSV to JSON conversion via instrument-core.
#[tauri::command]
pub fn tool_csv_to_json(input: CsvToJsonInput) -> CsvToJsonOutput {
    process(input)
}

