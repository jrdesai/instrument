//! Tauri commands for JSON tools (formatter, validator, diff, etc.).

use instrument_core::json::diff::{
    process as json_diff_process_core, JsonDiffInput, JsonDiffOutput,
};
use instrument_core::json::formatter::{
    process as json_format_process_core, JsonFormatInput, JsonFormatOutput,
};
use instrument_core::json::validator::{
    process as json_validate_process_core, JsonValidateInput, JsonValidateOutput,
};

/// Runs JSON format/minify via instrument-core.
#[tauri::command]
pub fn tool_json_format(input: JsonFormatInput) -> JsonFormatOutput {
    json_format_process_core(input)
}

/// Runs JSON validation and structure summary via instrument-core.
#[tauri::command]
pub fn tool_json_validate(input: JsonValidateInput) -> JsonValidateOutput {
    json_validate_process_core(input)
}

/// Runs JSON diff (compare two JSON values) via instrument-core.
#[tauri::command]
pub fn tool_json_diff(input: JsonDiffInput) -> JsonDiffOutput {
    json_diff_process_core(input)
}
