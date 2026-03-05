//! Tauri commands for text tools (case converter, etc.).

use instrument_core::text::case::{process as case_process_core, CaseInput, CaseOutput};

/// Runs case conversion via instrument-core.
#[tauri::command]
pub fn case_process(input: CaseInput) -> CaseOutput {
    case_process_core(input)
}

