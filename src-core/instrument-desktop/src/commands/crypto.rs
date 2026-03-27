//! Tauri commands for crypto tools (MD5, SHA-256, SHA-512, AES-GCM, UUID, ULID, API keys, etc.).

use std::time::Instant;

use instrument_core::crypto::md5::{process, Md5Input, Md5Output};
use instrument_core::crypto::sha256::{
    process as sha256_process_core, Sha256Input, Sha256Output,
};
use instrument_core::crypto::sha512::{
    process as sha512_process_core, Sha512Input, Sha512Output,
};
use instrument_core::crypto::uuid_gen::{
    inspect as uuid_inspect_core, process as uuid_process_core,
    UuidInspectInput, UuidInspectOutput, UuidInput, UuidOutput,
};
use instrument_core::crypto::ulid::{
    inspect as ulid_inspect_core, process as ulid_process_core,
    UlidInspectInput, UlidInspectOutput, UlidInput, UlidOutput,
};
use instrument_core::crypto::aes::{process as aes_process_core, AesInput, AesOutput};
use instrument_core::crypto::api_key::{process as api_key_process_core, ApiKeyInput, ApiKeyOutput};
use instrument_core::crypto::nanoid::{
    process as nanoid_process_core, NanoIdInput, NanoIdOutput,
};

use crate::command_log::finish_ok;

/// Runs MD5 hash via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn md5_process(input: Md5Input) -> Md5Output {
    let start = Instant::now();
    let output = process(input);
    finish_ok("md5_process", start);
    output
}

/// Runs SHA-256 hash via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn sha256_process(input: Sha256Input) -> Sha256Output {
    let start = Instant::now();
    let output = sha256_process_core(input);
    finish_ok("sha256_process", start);
    output
}

/// Runs SHA-512 hash via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn sha512_process(input: Sha512Input) -> Sha512Output {
    let start = Instant::now();
    let output = sha512_process_core(input);
    finish_ok("sha512_process", start);
    output
}

/// Runs UUID generation via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn uuid_process(input: UuidInput) -> UuidOutput {
    let start = Instant::now();
    let output = uuid_process_core(input);
    finish_ok("uuid_process", start);
    output
}

/// Runs UUID inspection via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn uuid_inspect(input: UuidInspectInput) -> UuidInspectOutput {
    let start = Instant::now();
    let output = uuid_inspect_core(input);
    finish_ok("uuid_inspect", start);
    output
}

/// Runs ULID generation via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn ulid_process(input: UlidInput) -> UlidOutput {
    let start = Instant::now();
    let output = ulid_process_core(input);
    finish_ok("ulid_process", start);
    output
}

/// Runs ULID inspection via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn ulid_inspect(input: UlidInspectInput) -> UlidInspectOutput {
    let start = Instant::now();
    let output = ulid_inspect_core(input);
    finish_ok("ulid_inspect", start);
    output
}

/// Runs API key generation via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn api_key_process(input: ApiKeyInput) -> ApiKeyOutput {
    let start = Instant::now();
    let output = api_key_process_core(input);
    finish_ok("api_key_process", start);
    output
}

/// Runs Nano ID generation via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn nanoid_process(input: NanoIdInput) -> NanoIdOutput {
    let start = Instant::now();
    let output = nanoid_process_core(input);
    finish_ok("nanoid_process", start);
    output
}

/// Runs AES-256-GCM encrypt/decrypt via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn aes_process(input: AesInput) -> AesOutput {
    let start = Instant::now();
    let output = aes_process_core(input);
    finish_ok("aes_process", start);
    output
}
