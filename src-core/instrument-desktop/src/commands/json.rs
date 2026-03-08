//! Tauri commands for JSON tools (formatter, validator, diff, etc.).

use instrument_core::json::formatter::{
    process as json_format_process_core, JsonFormatInput, JsonFormatOutput,
};

/// Runs JSON format/minify via instrument-core.
#[tauri::command]
pub fn tool_json_format(input: JsonFormatInput) -> JsonFormatOutput {
    json_format_process_core(input)
}
