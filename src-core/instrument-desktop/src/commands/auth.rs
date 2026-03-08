//! Tauri commands for auth tools (JWT decode, etc.).

use instrument_core::auth::jwt_decoder::{
    process as jwt_decode_process_core, JwtDecodeInput, JwtDecodeOutput,
};

/// Runs JWT decode via instrument-core.
#[tauri::command]
pub fn tool_jwt_decode(input: JwtDecodeInput) -> JwtDecodeOutput {
    jwt_decode_process_core(input)
}
