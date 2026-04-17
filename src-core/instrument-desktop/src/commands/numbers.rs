//! Tauri commands for number tools (base converter, bitwise, etc.).

use std::time::Instant;

use instrument_core::numbers::base_converter::{
    process as base_converter_process_core,
    BaseConverterInput,
    BaseConverterOutput,
};
use instrument_core::numbers::bitwise::{
    process as bitwise_process_core,
    BitwiseInput,
    BitwiseOutput,
};
use instrument_core::numbers::chmod::{
    process as chmod_process_core,
    ChmodInput,
    ChmodOutput,
};
use instrument_core::numbers::color_contrast::{
    process as color_contrast_process_core,
    ColorContrastInput,
    ColorContrastOutput,
};
use instrument_core::numbers::semver::{
    process as semver_process_core, SemverInput, SemverOutput,
};
use instrument_core::numbers::unit_converter::{
    process as unit_convert_core, UnitConverterInput, UnitConverterOutput,
};

use crate::command_log::finish_ok;

/// Runs base conversion via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_base_converter_process(input: BaseConverterInput) -> BaseConverterOutput {
    let start = Instant::now();
    let output = base_converter_process_core(input);
    finish_ok("tool_base_converter_process", start);
    output
}

/// Runs bitwise operations via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_bitwise_process(input: BitwiseInput) -> BitwiseOutput {
    let start = Instant::now();
    let output = bitwise_process_core(input);
    finish_ok("tool_bitwise_process", start);
    output
}

/// Parses Unix permission strings (octal or symbolic) via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_chmod_process(input: ChmodInput) -> ChmodOutput {
    let start = Instant::now();
    let output = chmod_process_core(input);
    finish_ok("tool_chmod_process", start);
    output
}

/// Parse semver, compare versions, check version ranges, and bump major/minor/patch.
#[tauri::command]
#[specta::specta]
pub fn tool_semver_process(input: SemverInput) -> SemverOutput {
    let start = Instant::now();
    let output = semver_process_core(input);
    finish_ok("tool_semver_process", start);
    output
}

/// Converts a value between units in a given category.
#[tauri::command]
#[specta::specta]
pub fn tool_unit_convert(input: UnitConverterInput) -> UnitConverterOutput {
    let start = Instant::now();
    let output = unit_convert_core(input);
    finish_ok("tool_unit_convert", start);
    output
}

/// Computes WCAG contrast ratio for a foreground/background colour pair.
#[tauri::command]
#[specta::specta]
pub fn tool_color_contrast_process(input: ColorContrastInput) -> ColorContrastOutput {
    let start = Instant::now();
    let output = color_contrast_process_core(input);
    finish_ok("tool_color_contrast_process", start);
    output
}
