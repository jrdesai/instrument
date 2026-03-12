//! Tauri command wrappers for regex-core.

use regex_core::explain;
use regex_core::router;
use regex_core::types::{ExplainRequest, ExplainToken, MatchResult, RegexRequest};

/// Runs a regex test via regex-core for desktop (native) builds.
#[tauri::command]
pub fn tool_regex_test(req: RegexRequest) -> Result<Vec<MatchResult>, String> {
    router::run(&req)
}

/// Returns a structured explanation of the regex pattern (HIR tokens).
#[tauri::command]
pub fn tool_regex_explain(req: ExplainRequest) -> Result<Vec<ExplainToken>, String> {
    explain::run(&req)
}

