//! Tauri commands for number tools (base converter, bitwise, etc.).

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

/// Runs base conversion via instrument-core.
#[tauri::command]
pub fn base_converter_process(input: BaseConverterInput) -> BaseConverterOutput {
    base_converter_process_core(input)
}

/// Runs bitwise operations via instrument-core.
#[tauri::command]
pub fn bitwise_process(input: BitwiseInput) -> BitwiseOutput {
    bitwise_process_core(input)
}
