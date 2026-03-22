//! Tauri commands for JSON tools (formatter, validator, diff, path, converter, etc.).

use std::time::Instant;

use instrument_core::json::diff::{
    process as json_diff_process_core, JsonDiffInput, JsonDiffOutput,
};
use instrument_core::json::formatter::{
    process as json_format_process_core, JsonFormatInput, JsonFormatOutput,
};
use instrument_core::json::path::{
    process as json_path_process_core, JsonPathInput, JsonPathOutput,
};
use instrument_core::json::converter::{
    process as json_convert_process_core, JsonConvertInput, JsonConvertOutput,
};
use instrument_core::json::yaml_to_json::{
    process as yaml_to_json_process_core, YamlToJsonInput, YamlToJsonOutput,
};
use instrument_core::json::validator::{
    process as json_validate_process_core, JsonValidateInput, JsonValidateOutput,
};

use crate::command_log::finish_ok;

/// Runs JSON format/minify via instrument-core.
#[tauri::command]
pub fn tool_json_format(input: JsonFormatInput) -> JsonFormatOutput {
    let start = Instant::now();
    let output = json_format_process_core(input);
    finish_ok("tool_json_format", start);
    output
}

/// Runs JSON validation and structure summary via instrument-core.
#[tauri::command]
pub fn tool_json_validate(input: JsonValidateInput) -> JsonValidateOutput {
    let start = Instant::now();
    let output = json_validate_process_core(input);
    finish_ok("tool_json_validate", start);
    output
}

/// Runs JSON diff (compare two JSON values) via instrument-core.
#[tauri::command]
pub fn tool_json_diff(input: JsonDiffInput) -> JsonDiffOutput {
    let start = Instant::now();
    let output = json_diff_process_core(input);
    finish_ok("tool_json_diff", start);
    output
}

/// Runs JSONPath query against a JSON document via instrument-core.
#[tauri::command]
pub fn tool_json_path(input: JsonPathInput) -> JsonPathOutput {
    let start = Instant::now();
    let output = json_path_process_core(input);
    finish_ok("tool_json_path", start);
    output
}

/// Runs JSON conversion (YAML, TypeScript, CSV, XML) via instrument-core.
#[tauri::command]
pub fn tool_json_convert(input: JsonConvertInput) -> JsonConvertOutput {
    let start = Instant::now();
    let output = json_convert_process_core(input);
    finish_ok("tool_json_convert", start);
    output
}

/// Converts YAML input into formatted JSON via instrument-core.
#[tauri::command]
pub fn tool_yaml_to_json(input: YamlToJsonInput) -> YamlToJsonOutput {
    let start = Instant::now();
    let output = yaml_to_json_process_core(input);
    finish_ok("tool_yaml_to_json", start);
    output
}
