//! Privacy-safe timing logs for Tauri commands (tool name + duration + error text only).

use std::time::Instant;

/// Threshold above which a tool call is considered slow and worth logging.
const SLOW_MS: u128 = 200;

/// Log successful command completion (never logs input/output).
/// Fast completions (<200ms) are silent — they are routine and would flood the log
/// for auto-run tools that fire on every keystroke. Only slow calls appear.
pub(crate) fn finish_ok(tool: &'static str, start: Instant) {
    let elapsed = start.elapsed().as_millis();
    if elapsed > SLOW_MS {
        log::warn!("tool: {} completed in {}ms (slow)", tool, elapsed);
    }
}

/// Log `Result`-based command completion or error (error message only).
/// Fast successful completions are silent; slow calls warn; errors always log.
pub(crate) fn finish_result<T, E: std::fmt::Display>(
    tool: &'static str,
    start: Instant,
    result: &Result<T, E>,
) {
    let elapsed = start.elapsed().as_millis();
    match result {
        Ok(_) => {
            if elapsed > SLOW_MS {
                log::warn!("tool: {} completed in {}ms (slow)", tool, elapsed);
            }
        }
        Err(e) => {
            log::error!("tool: {} failed in {}ms: {}", tool, elapsed, e);
        }
    }
}
