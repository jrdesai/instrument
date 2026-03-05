//! Tauri commands for crypto tools (MD5, SHA-256, SHA-512, UUID, ULID, API keys, etc.).

use instrument_core::crypto::md5::{process, Md5Input, Md5Output};
use instrument_core::crypto::sha256::{
    process as sha256_process_core, Sha256Input, Sha256Output,
};
use instrument_core::crypto::sha512::{
    process as sha512_process_core, Sha512Input, Sha512Output,
};
use instrument_core::crypto::uuid_gen::{
    process as uuid_process_core, UuidInput, UuidOutput,
};
use instrument_core::crypto::ulid::{process as ulid_process_core, UlidInput, UlidOutput};
use instrument_core::crypto::api_key::{process as api_key_process_core, ApiKeyInput, ApiKeyOutput};

/// Runs MD5 hash via instrument-core.
#[tauri::command]
pub fn md5_process(input: Md5Input) -> Md5Output {
    process(input)
}

/// Runs SHA-256 hash via instrument-core.
#[tauri::command]
pub fn sha256_process(input: Sha256Input) -> Sha256Output {
    sha256_process_core(input)
}

/// Runs SHA-512 hash via instrument-core.
#[tauri::command]
pub fn sha512_process(input: Sha512Input) -> Sha512Output {
    sha512_process_core(input)
}

/// Runs UUID generation via instrument-core.
#[tauri::command]
pub fn uuid_process(input: UuidInput) -> UuidOutput {
    uuid_process_core(input)
}

/// Runs ULID generation via instrument-core.
#[tauri::command]
pub fn ulid_process(input: UlidInput) -> UlidOutput {
    ulid_process_core(input)
}

/// Runs API key generation via instrument-core.
#[tauri::command]
pub fn api_key_process(input: ApiKeyInput) -> ApiKeyOutput {
    api_key_process_core(input)
}
