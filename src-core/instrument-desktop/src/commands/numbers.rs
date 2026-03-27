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

use crate::command_log::finish_ok;

/// Runs base conversion via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn base_converter_process(input: BaseConverterInput) -> BaseConverterOutput {
    let start = Instant::now();
    let output = base_converter_process_core(input);
    finish_ok("base_converter_process", start);
    output
}

/// Runs bitwise operations via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn bitwise_process(input: BitwiseInput) -> BitwiseOutput {
    let start = Instant::now();
    let output = bitwise_process_core(input);
    finish_ok("bitwise_process", start);
    output
}
