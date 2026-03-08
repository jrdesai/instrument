//! Tauri commands for auth tools (JWT decode, build, etc.).

use instrument_core::auth::jwt_builder::{
    process as jwt_build_process_core, JwtBuildInput, JwtBuildOutput,
};
use instrument_core::auth::jwt_decoder::{
    process as jwt_decode_process_core, JwtDecodeInput, JwtDecodeOutput,
};

/// Runs JWT decode via instrument-core.
#[tauri::command]
pub fn tool_jwt_decode(input: JwtDecodeInput) -> JwtDecodeOutput {
    jwt_decode_process_core(input)
}

/// Runs JWT build via instrument-core.
#[tauri::command]
pub fn tool_jwt_build(input: JwtBuildInput) -> JwtBuildOutput {
    jwt_build_process_core(input)
}
