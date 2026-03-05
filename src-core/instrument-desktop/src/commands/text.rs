//! Tauri commands for text tools (case converter, word counter, etc.).

use instrument_core::text::case::{process as case_process_core, CaseInput, CaseOutput};
use instrument_core::text::word_counter::{
    process as word_counter_process_core, WordCounterInput, WordCounterOutput,
};

/// Runs case conversion via instrument-core.
#[tauri::command]
pub fn case_process(input: CaseInput) -> CaseOutput {
    case_process_core(input)
}

/// Runs word counting via instrument-core.
#[tauri::command]
pub fn word_counter_process(input: WordCounterInput) -> WordCounterOutput {
    word_counter_process_core(input)
}

