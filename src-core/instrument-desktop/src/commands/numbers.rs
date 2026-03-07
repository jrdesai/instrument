//! Tauri commands for number tools (base converter, etc.).

use instrument_core::numbers::base_converter::{
    process as base_converter_process_core,
    BaseConverterInput,
    BaseConverterOutput,
};

/// Runs base conversion via instrument-core.
#[tauri::command]
pub fn base_converter_process(input: BaseConverterInput) -> BaseConverterOutput {
    base_converter_process_core(input)
}
