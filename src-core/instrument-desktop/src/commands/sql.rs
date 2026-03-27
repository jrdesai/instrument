//! Tauri command wrapper for SQL formatting.

use std::time::Instant;

use instrument_core::sql::{process, SqlFormatInput, SqlFormatOutput};

use crate::command_log::finish_ok;

/// Runs SQL formatting via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn tool_sql_format(input: SqlFormatInput) -> SqlFormatOutput {
    let start = Instant::now();
    let output = process(input);
    finish_ok("tool_sql_format", start);
    output
}
