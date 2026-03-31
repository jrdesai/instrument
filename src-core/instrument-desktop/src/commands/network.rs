//! Tauri commands for network tools (URL parser, etc.).

use std::time::Instant;

use instrument_core::network::cidr::{process as cidr_process_core, CidrInput, CidrOutput};
use instrument_core::network::{process as url_parse_process, UrlParseInput, UrlParseOutput};

use crate::command_log::finish_ok;

#[tauri::command]
#[specta::specta]
pub fn tool_url_parse(input: UrlParseInput) -> UrlParseOutput {
    let start = Instant::now();
    let output = url_parse_process(input);
    finish_ok("tool_url_parse", start);
    output
}

#[tauri::command]
#[specta::specta]
pub fn cidr_calculate(input: CidrInput) -> CidrOutput {
    let start = Instant::now();
    let output = cidr_process_core(input);
    finish_ok("cidr_calculate", start);
    output
}
