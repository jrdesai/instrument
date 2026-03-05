//! WASM bindings for Instrument tools. Each export mirrors a Tauri command.

use instrument_core::crypto::md5::{process as md5_process_core, Md5Input, Md5Output};
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
