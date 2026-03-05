//! WASM bindings for Instrument tools. Each export mirrors a Tauri command.

use instrument_core::crypto::md5::{process as md5_process_core, Md5Input, Md5Output};
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
use instrument_core::encoding::base64::{process, Base64Input};
use instrument_core::encoding::hex::{
    process as hex_process_core, HexInput, HexOutput,
};
use instrument_core::encoding::html_entity::{
    process as html_entity_process_core, HtmlEntityInput, HtmlEntityOutput,
};
use instrument_core::encoding::url::{process as url_process, UrlEncodeInput, UrlEncodeOutput};
use serde_wasm_bindgen::{from_value, to_value};
use wasm_bindgen::prelude::*;

/// Base64 encode/decode. Receives a Base64Input (camelCase) and returns a Base64Output (camelCase).
#[wasm_bindgen(js_name = base64_process)]
pub fn base64_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: Base64Input =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output = process(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// URL percent-encode/decode. Receives UrlEncodeInput (camelCase) and returns UrlEncodeOutput (camelCase).
#[wasm_bindgen(js_name = url_encode_process)]
pub fn url_encode_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: UrlEncodeInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: UrlEncodeOutput = url_process(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// HTML entity encode/decode. Receives HtmlEntityInput (camelCase) and returns HtmlEntityOutput (camelCase).
#[wasm_bindgen(js_name = html_entity_process)]
pub fn html_entity_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: HtmlEntityInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: HtmlEntityOutput = html_entity_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Hex encode/decode. Receives HexInput (camelCase) and returns HexOutput (camelCase).
#[wasm_bindgen(js_name = hex_process)]
pub fn hex_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: HexInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: HexOutput = hex_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// MD5 hash. Receives Md5Input (camelCase) and returns Md5Output (camelCase).
#[wasm_bindgen(js_name = md5_process)]
pub fn md5_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: Md5Input =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: Md5Output = md5_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// SHA-256 hash. Receives Sha256Input (camelCase) and returns Sha256Output (camelCase).
#[wasm_bindgen(js_name = sha256_process)]
pub fn sha256_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: Sha256Input =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: Sha256Output = sha256_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// SHA-512 hash. Receives Sha512Input (camelCase) and returns Sha512Output (camelCase).
#[wasm_bindgen(js_name = sha512_process)]
pub fn sha512_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: Sha512Input =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: Sha512Output = sha512_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// UUID generation. Receives UuidInput (camelCase) and returns UuidOutput (camelCase).
#[wasm_bindgen(js_name = uuid_process)]
pub fn uuid_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: UuidInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: UuidOutput = uuid_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// ULID generation. Receives UlidInput (camelCase) and returns UlidOutput (camelCase).
#[wasm_bindgen(js_name = ulid_process)]
pub fn ulid_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: UlidInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: UlidOutput = ulid_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}
