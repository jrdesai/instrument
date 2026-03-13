//! Tauri command wrapper for expression evaluation.

use instrument_core::expression::{process, ExprEvalInput, ExprEvalOutput};

#[tauri::command]
pub fn tool_expression_eval(input: ExprEvalInput) -> ExprEvalOutput {
    process(input)
}

