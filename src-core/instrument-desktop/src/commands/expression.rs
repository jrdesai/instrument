//! Tauri command wrapper for expression evaluation.

use std::time::Instant;

use instrument_core::expression::{process, ExprEvalInput, ExprEvalOutput};

use crate::command_log::finish_ok;

#[tauri::command]
pub fn tool_expression_eval(input: ExprEvalInput) -> ExprEvalOutput {
    let start = Instant::now();
    let output = process(input);
    finish_ok("tool_expression_eval", start);
    output
}
