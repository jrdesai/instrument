//! Tauri commands for text tools (case converter, word counter, string escaper, find-replace, etc.).

use std::time::Instant;

use instrument_core::text::case::{process as case_process_core, CaseInput, CaseOutput};
use instrument_core::text::find_replace::{
    process as find_replace_process_core, FindReplaceInput, FindReplaceOutput,
};
use instrument_core::text::diff::{
    process as text_diff_process_core, TextDiffInput, TextDiffOutput,
};
use instrument_core::text::string_escaper::{
    process as string_escaper_process_core, StringEscaperInput, StringEscaperOutput,
};
use instrument_core::text::lorem_ipsum::{
    process as lorem_ipsum_process_core, LoremIpsumInput, LoremIpsumOutput,
};
use instrument_core::text::word_counter::{
    process as word_counter_process_core, WordCounterInput, WordCounterOutput,
};

use crate::command_log::finish_ok;

/// Runs case conversion via instrument-core.
#[tauri::command]
pub fn case_process(input: CaseInput) -> CaseOutput {
    let start = Instant::now();
    let output = case_process_core(input);
    finish_ok("case_process", start);
    output
}

/// Runs word counting via instrument-core.
#[tauri::command]
pub fn word_counter_process(input: WordCounterInput) -> WordCounterOutput {
    let start = Instant::now();
    let output = word_counter_process_core(input);
    finish_ok("word_counter_process", start);
    output
}

/// Runs string escape/unescape via instrument-core.
#[tauri::command]
pub fn string_escaper_process(input: StringEscaperInput) -> StringEscaperOutput {
    let start = Instant::now();
    let output = string_escaper_process_core(input);
    finish_ok("string_escaper_process", start);
    output
}

/// Runs find and replace via instrument-core.
#[tauri::command]
pub fn find_replace_process(input: FindReplaceInput) -> FindReplaceOutput {
    let start = Instant::now();
    let output = find_replace_process_core(input);
    finish_ok("find_replace_process", start);
    output
}

/// Runs lorem ipsum generation via instrument-core.
#[tauri::command]
pub fn lorem_ipsum_process(input: LoremIpsumInput) -> LoremIpsumOutput {
    let start = Instant::now();
    let output = lorem_ipsum_process_core(input);
    finish_ok("lorem_ipsum_process", start);
    output
}

/// Runs line-by-line text diff via instrument-core.
#[tauri::command]
pub fn text_diff_process(input: TextDiffInput) -> TextDiffOutput {
    let start = Instant::now();
    let output = text_diff_process_core(input);
    finish_ok("text_diff_process", start);
    output
}
