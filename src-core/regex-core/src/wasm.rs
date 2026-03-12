// When built as a dependency of instrument-web, we do not export wasm_bindgen symbols
// (instrument-web provides the only exports). Enable "wasm-export" when building
// regex-core standalone as WASM.
#[cfg(feature = "wasm-export")]
use crate::{explain, router, types::ExplainRequest, types::RegexRequest};
#[cfg(feature = "wasm-export")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "wasm-export")]
#[wasm_bindgen]
pub fn regex_match(val: JsValue) -> Result<JsValue, JsValue> {
    let req: RegexRequest = serde_wasm_bindgen::from_value(val)
        .map_err(|e| JsValue::from_str(&format!("Invalid request: {}", e)))?;

    let result = router::run(&req).map_err(|e| JsValue::from_str(&e))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[cfg(feature = "wasm-export")]
#[wasm_bindgen]
pub fn regex_explain(val: JsValue) -> Result<JsValue, JsValue> {
    let req: ExplainRequest = serde_wasm_bindgen::from_value(val)
        .map_err(|e| JsValue::from_str(&format!("Invalid request: {}", e)))?;

    let result = explain::run(&req).map_err(|e| JsValue::from_str(&e))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

