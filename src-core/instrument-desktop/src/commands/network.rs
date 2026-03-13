//! Tauri commands for network tools (URL parser, etc.).

use instrument_core::network::{process as url_parse_process, UrlParseInput, UrlParseOutput};

#[tauri::command]
pub fn tool_url_parse(input: UrlParseInput) -> UrlParseOutput {
    url_parse_process(input)
}
