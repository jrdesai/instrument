//! Tauri commands for encoding tools (Base64, URL encoder, HTML entity, Hex, etc.).

use std::time::Instant;

use instrument_core::encoding::base64::{process, Base64Input, Base64Output};
use instrument_core::encoding::html_entity::{
    process as html_entity_process_core, HtmlEntityInput, HtmlEntityOutput,
};
use instrument_core::encoding::hex::{process as hex_process_core, HexInput, HexOutput};
use instrument_core::encoding::url::{process as url_process, UrlEncodeInput, UrlEncodeOutput};

use crate::command_log::finish_ok;

/// Runs Base64 encode or decode via instrument-core.
#[tauri::command]
pub fn base64_process(input: Base64Input) -> Base64Output {
    let start = Instant::now();
    let output = process(input);
    finish_ok("base64_process", start);
    output
}

/// Runs URL percent-encode or decode via instrument-core.
#[tauri::command]
pub fn url_encode_process(input: UrlEncodeInput) -> UrlEncodeOutput {
    let start = Instant::now();
    let output = url_process(input);
    finish_ok("url_encode_process", start);
    output
}

/// Runs HTML entity encode or decode via instrument-core.
#[tauri::command]
pub fn html_entity_process(input: HtmlEntityInput) -> HtmlEntityOutput {
    let start = Instant::now();
    let output = html_entity_process_core(input);
    finish_ok("html_entity_process", start);
    output
}

/// Runs Hex encode or decode via instrument-core.
#[tauri::command]
pub fn hex_process(input: HexInput) -> HexOutput {
    let start = Instant::now();
    let output = hex_process_core(input);
    finish_ok("hex_process", start);
    output
}
