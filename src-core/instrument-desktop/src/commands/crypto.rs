//! Tauri commands for crypto tools (MD5, etc.).

use instrument_core::crypto::md5::{process, Md5Input, Md5Output};

/// Runs MD5 hash via instrument-core.
#[tauri::command]
pub fn md5_process(input: Md5Input) -> Md5Output {
    process(input)
}
