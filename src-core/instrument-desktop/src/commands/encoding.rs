//! Tauri commands for encoding tools (Base64, URL encoder, HTML entity, etc.).

use instrument_core::encoding::base64::{process, Base64Input, Base64Output};
use instrument_core::encoding::html_entity::{
    process as html_entity_process_core, HtmlEntityInput, HtmlEntityOutput,
};
use instrument_core::encoding::url::{process as url_process, UrlEncodeInput, UrlEncodeOutput};

/// Runs Base64 encode or decode via instrument-core.
#[tauri::command]
pub fn base64_process(input: Base64Input) -> Base64Output {
    process(input)
}

/// Runs URL percent-encode or decode via instrument-core.
#[tauri::command]
pub fn url_encode_process(input: UrlEncodeInput) -> UrlEncodeOutput {
    url_process(input)
}

/// Runs HTML entity encode or decode via instrument-core.
#[tauri::command]
pub fn html_entity_process(input: HtmlEntityInput) -> HtmlEntityOutput {
    html_entity_process_core(input)
}
