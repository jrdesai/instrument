use std::time::Instant;

use instrument_core::yaml_fmt::{process, YamlFormatInput, YamlFormatOutput};

use crate::command_log::finish_ok;

#[tauri::command]
#[specta::specta]
pub fn tool_yaml_format(input: YamlFormatInput) -> YamlFormatOutput {
    let start = Instant::now();
    let output = process(input);
    finish_ok("tool_yaml_format", start);
    output
}
