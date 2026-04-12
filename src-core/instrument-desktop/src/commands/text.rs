//! Tauri commands for text tools (case converter, word counter, string escaper, find-replace, etc.).

use std::time::Instant;

use instrument_core::text::case::{process as case_process_core, CaseInput, CaseOutput};
use instrument_core::text::find_replace::{
    process as find_replace_process_core, FindReplaceInput, FindReplaceOutput,
};
use instrument_core::text::diff::{
    process as text_diff_process_core, TextDiffInput, TextDiffOutput,
};
use instrument_core::text::env_parser::{
    process as env_parse_process_core, EnvParseInput, EnvParseOutput,
};
use instrument_core::text::fake_data::{
    process as fake_data_process_core, FakeDataInput, FakeDataOutput,
};
use instrument_core::text::line_tools::{
    process as line_tools_process_core, LineToolsInput, LineToolsOutput,
};
use instrument_core::text::string_escaper::{
    process as string_escaper_process_core, StringEscaperInput, StringEscaperOutput,
};
use instrument_core::text::lorem_ipsum::{
    process as lorem_ipsum_process_core, LoremIpsumInput, LoremIpsumOutput,
};
use instrument_core::text::slug::{process as slug_generate_core, SlugInput, SlugOutput};
use instrument_core::text::unicode::{
    process as unicode_inspect_core, UnicodeInspectInput, UnicodeInspectOutput,
};
use instrument_core::text::word_counter::{
    process as word_counter_process_core, WordCounterInput, WordCounterOutput,
};

use crate::command_log::finish_ok;

/// Runs case conversion via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn case_process(input: CaseInput) -> CaseOutput {
    let start = Instant::now();
    let output = case_process_core(input);
    finish_ok("case_process", start);
    output
}

/// Runs word counting via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn word_counter_process(input: WordCounterInput) -> WordCounterOutput {
    let start = Instant::now();
    let output = word_counter_process_core(input);
    finish_ok("word_counter_process", start);
    output
}

/// Runs string escape/unescape via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn string_escaper_process(input: StringEscaperInput) -> StringEscaperOutput {
    let start = Instant::now();
    let output = string_escaper_process_core(input);
    finish_ok("string_escaper_process", start);
    output
}

/// Runs find and replace via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn find_replace_process(input: FindReplaceInput) -> FindReplaceOutput {
    let start = Instant::now();
    let output = find_replace_process_core(input);
    finish_ok("find_replace_process", start);
    output
}

/// Runs lorem ipsum generation via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn lorem_ipsum_process(input: LoremIpsumInput) -> LoremIpsumOutput {
    let start = Instant::now();
    let output = lorem_ipsum_process_core(input);
    finish_ok("lorem_ipsum_process", start);
    output
}

/// Runs line-by-line text diff via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn text_diff_process(input: TextDiffInput) -> TextDiffOutput {
    let start = Instant::now();
    let output = text_diff_process_core(input);
    finish_ok("text_diff_process", start);
    output
}

/// Runs line-level text tools via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn line_tools_process(input: LineToolsInput) -> LineToolsOutput {
    let start = Instant::now();
    let output = line_tools_process_core(input);
    finish_ok("line_tools_process", start);
    output
}

/// Parses and validates .env content via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn env_parse(input: EnvParseInput) -> EnvParseOutput {
    let start = Instant::now();
    let output = env_parse_process_core(input);
    finish_ok("env_parse", start);
    output
}

/// Runs Unicode character inspection via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_unicode_inspect(input: UnicodeInspectInput) -> UnicodeInspectOutput {
    let start = Instant::now();
    let output = unicode_inspect_core(input);
    finish_ok("tool_unicode_inspect", start);
    output
}

/// Runs slug generation via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_slug_generate(input: SlugInput) -> SlugOutput {
    let start = Instant::now();
    let output = slug_generate_core(input);
    finish_ok("tool_slug_generate", start);
    output
}

/// Generates fake records from a field schema (JSON output).
#[tauri::command]
#[specta::specta]
pub fn fake_data_process(input: FakeDataInput) -> FakeDataOutput {
    let start = Instant::now();
    let output = fake_data_process_core(input);
    finish_ok("fake_data_process", start);
    output
}
