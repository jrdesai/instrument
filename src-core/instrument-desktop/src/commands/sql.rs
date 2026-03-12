//! Tauri command wrapper for SQL formatting.

use instrument_core::sql::{process, SqlFormatInput, SqlFormatOutput};

/// Runs SQL formatting via instrument-core.
#[tauri::command]
pub fn tool_sql_format(input: SqlFormatInput) -> SqlFormatOutput {
    process(input)
}

