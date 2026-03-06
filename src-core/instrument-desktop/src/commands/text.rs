//! Tauri commands for text tools (case converter, word counter, string escaper, find-replace, etc.).

use instrument_core::text::case::{process as case_process_core, CaseInput, CaseOutput};
use instrument_core::text::find_replace::{
    process as find_replace_process_core, FindReplaceInput, FindReplaceOutput,
};
use instrument_core::text::string_escaper::{
    process as string_escaper_process_core, StringEscaperInput, StringEscaperOutput,
};
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

/// Runs string escape/unescape via instrument-core.
#[tauri::command]
pub fn string_escaper_process(input: StringEscaperInput) -> StringEscaperOutput {
    string_escaper_process_core(input)
}

/// Runs find and replace via instrument-core.
#[tauri::command]
pub fn find_replace_process(input: FindReplaceInput) -> FindReplaceOutput {
    find_replace_process_core(input)
}

