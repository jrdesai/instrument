use std::time::Instant;

use instrument_core::xml::{process, XmlFormatInput, XmlFormatOutput};

use crate::command_log::finish_ok;

#[tauri::command]
#[specta::specta]
pub fn tool_xml_format(input: XmlFormatInput) -> XmlFormatOutput {
    let start = Instant::now();
    let output = process(input);
    finish_ok("tool_xml_format", start);
    output
}
