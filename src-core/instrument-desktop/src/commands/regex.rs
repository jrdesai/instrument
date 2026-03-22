//! Tauri command wrappers for regex-core.

use std::time::Instant;

use regex_core::explain;
use regex_core::router;
use regex_core::types::{ExplainRequest, ExplainToken, MatchResult, RegexRequest};

use crate::command_log::finish_result;

/// Runs a regex test via regex-core for desktop (native) builds.
#[tauri::command]
pub fn tool_regex_test(req: RegexRequest) -> Result<Vec<MatchResult>, String> {
    let start = Instant::now();
    let result = router::run(&req);
    finish_result("tool_regex_test", start, &result);
    result
}

/// Returns a structured explanation of the regex pattern (HIR tokens).
#[tauri::command]
pub fn tool_regex_explain(req: ExplainRequest) -> Result<Vec<ExplainToken>, String> {
    let start = Instant::now();
    let result = explain::run(&req);
    finish_result("tool_regex_explain", start, &result);
    result
}
