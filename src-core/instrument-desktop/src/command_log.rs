//! Privacy-safe timing logs for Tauri commands.
//!
//! ## What is logged
//! - `WARN`  — tool completed but took longer than [`SLOW_MS`] milliseconds
//! - `ERROR` — tool returned an error (error message text only, never input/output values)
//! - `INFO`  — app startup (logged from `src-tauri/src/lib.rs`)
//!
//! ## What is NOT logged (by design)
//! - Fast successful completions (<[`SLOW_MS`]ms) — intentionally silent.
//!   Most tools are auto-run and fire on every keystroke; logging each call would
//!   produce hundreds of identical "completed in 0ms" lines per minute with no
//!   diagnostic value.
//! - Input values, output values, or any user content — privacy requirement.
//!
//! ## Log destinations
//! Configured in `src-tauri/src/lib.rs`:
//! - **Terminal** (stdout): DEBUG+ for this crate — shows all tool calls during dev.
//! - **Log file**: WARN+ only — only anomalies (slow calls, errors) are persisted.

use std::time::Instant;

/// Tool calls faster than this threshold are not logged (see module docs).
const SLOW_MS: u128 = 200;

/// Log successful command completion (never logs input/output).
pub(crate) fn finish_ok(tool: &'static str, start: Instant) {
    let elapsed = start.elapsed().as_millis();
    if elapsed > SLOW_MS {
        log::warn!("tool: {} completed in {}ms (slow)", tool, elapsed);
    }
}

/// Log `Result`-based command completion or error (error message only, never input/output).
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
