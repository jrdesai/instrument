use std::time::Instant;

use instrument_core::html::{process, HtmlFormatInput, HtmlFormatOutput};

use crate::command_log::finish_ok;

#[tauri::command]
#[specta::specta]
pub fn tool_html_format(input: HtmlFormatInput) -> HtmlFormatOutput {
    let start = Instant::now();
    let output = process(input);
    finish_ok("tool_html_format", start);
    output
}
