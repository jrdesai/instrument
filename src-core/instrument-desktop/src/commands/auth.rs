//! Tauri commands for auth tools (JWT decode, build, etc.).

use std::time::Instant;

use instrument_core::auth::jwt_builder::{
    process as jwt_build_process_core, JwtBuildInput, JwtBuildOutput,
};
use instrument_core::auth::jwt_decoder::{
    process as jwt_decode_process_core, JwtDecodeInput, JwtDecodeOutput,
};

use crate::command_log::finish_ok;

/// Runs JWT decode via instrument-core.
#[tauri::command]
pub fn tool_jwt_decode(input: JwtDecodeInput) -> JwtDecodeOutput {
    let start = Instant::now();
    let output = jwt_decode_process_core(input);
    finish_ok("tool_jwt_decode", start);
    output
}

/// Runs JWT build via instrument-core.
#[tauri::command]
pub fn tool_jwt_build(input: JwtBuildInput) -> JwtBuildOutput {
    let start = Instant::now();
    let output = jwt_build_process_core(input);
    finish_ok("tool_jwt_build", start);
    output
}
