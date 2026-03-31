//! Tauri commands for crypto tools (combined hash, AES-GCM, UUID, ULID, API keys, etc.).

use std::time::Instant;

use instrument_core::crypto::hash::{process as hash_process_core, HashInput, HashOutput};
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
use instrument_core::crypto::cert::{process as cert_decode_core, CertDecodeInput, CertDecodeOutput};
use instrument_core::crypto::nanoid::{
    process as nanoid_process_core, NanoIdInput, NanoIdOutput,
};
use instrument_core::crypto::passphrase::{
    process as passphrase_process_core, PassphraseInput, PassphraseOutput,
};
use instrument_core::crypto::password::{process as password_process_core, PasswordInput, PasswordOutput};

use crate::command_log::finish_ok;

/// Runs combined hash (MD5, SHA-1/256/512, SHA3-256/512) via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn hash_process(input: HashInput) -> HashOutput {
    let start = Instant::now();
    let output = hash_process_core(input);
    finish_ok("hash_process", start);
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

/// Runs Password generation via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn password_process(input: PasswordInput) -> PasswordOutput {
    let start = Instant::now();
    let output = password_process_core(input);
    finish_ok("password_process", start);
    output
}

/// Runs Passphrase generation via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn passphrase_process(input: PassphraseInput) -> PassphraseOutput {
    let start = Instant::now();
    let output = passphrase_process_core(input);
    finish_ok("passphrase_process", start);
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

/// Decodes X.509 / PEM certificates via instrument-core.
#[tauri::command]
#[specta::specta]
pub fn cert_decode(input: CertDecodeInput) -> CertDecodeOutput {
    let start = Instant::now();
    let output = cert_decode_core(input);
    finish_ok("cert_decode", start);
    output
}
