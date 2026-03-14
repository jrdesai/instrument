//! WASM bindings for Instrument tools. Each export mirrors a Tauri command or shared core API.

use instrument_core::crypto::md5::{process as md5_process_core, Md5Input, Md5Output};
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
use instrument_core::text::case::{process as case_process_core, CaseInput, CaseOutput};
use instrument_core::text::find_replace::{
    process as find_replace_process_core, FindReplaceInput, FindReplaceOutput,
};
use instrument_core::text::lorem_ipsum::{
    process as lorem_ipsum_process_core, LoremIpsumInput, LoremIpsumOutput,
};
use instrument_core::text::string_escaper::{
    process as string_escaper_process_core, StringEscaperInput, StringEscaperOutput,
};
use instrument_core::text::word_counter::{
    process as word_counter_process_core, WordCounterInput, WordCounterOutput,
};
use instrument_core::crypto::api_key::{
    process as api_key_process_core, ApiKeyInput, ApiKeyOutput,
};
use instrument_core::encoding::base64::{process, Base64Input};
use instrument_core::encoding::hex::{
    process as hex_process_core, HexInput, HexOutput,
};
use instrument_core::encoding::html_entity::{
    process as html_entity_process_core, HtmlEntityInput, HtmlEntityOutput,
};
use instrument_core::encoding::url::{process as url_process, UrlEncodeInput, UrlEncodeOutput};
use instrument_core::network::{
    process as url_parse_process, UrlParseInput, UrlParseOutput,
};
use instrument_core::csv::{
    process as csv_to_json_process_core, CsvToJsonInput, CsvToJsonOutput,
};
use instrument_core::expression::{
    process as expression_eval_process_core, ExprEvalInput, ExprEvalOutput,
};
use instrument_core::sql::{
    process as sql_format_process_core, SqlFormatInput, SqlFormatOutput,
};
use regex_core::router as regex_router;
use regex_core::types::{
    ExplainRequest, ExplainToken as RegexExplainToken, MatchResult as RegexMatchResult, RegexRequest,
};
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

/// URL parser. Receives UrlParseInput (camelCase) and returns UrlParseOutput (camelCase).
#[wasm_bindgen(js_name = tool_url_parse)]
pub fn tool_url_parse_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: UrlParseInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: UrlParseOutput = url_parse_process(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// CSV → JSON converter. Receives CsvToJsonInput (camelCase) and returns CsvToJsonOutput (camelCase).
#[wasm_bindgen(js_name = tool_csv_to_json)]
pub fn tool_csv_to_json_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: CsvToJsonInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: CsvToJsonOutput = csv_to_json_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// SQL formatter. Receives SqlFormatInput (camelCase) and returns SqlFormatOutput (camelCase).
#[wasm_bindgen(js_name = tool_sql_format)]
pub fn tool_sql_format_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: SqlFormatInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: SqlFormatOutput = sql_format_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Expression evaluator. Receives ExprEvalInput (camelCase) and returns ExprEvalOutput (camelCase).
#[wasm_bindgen(js_name = tool_expression_eval)]
pub fn tool_expression_eval_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: ExprEvalInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: ExprEvalOutput = expression_eval_process_core(input);
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

/// UUID inspection. Receives UuidInspectInput (camelCase) and returns UuidInspectOutput (camelCase).
#[wasm_bindgen(js_name = uuid_inspect)]
pub fn uuid_inspect_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: UuidInspectInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: UuidInspectOutput = uuid_inspect_core(input);
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

/// ULID inspection. Receives UlidInspectInput (camelCase) and returns UlidInspectOutput (camelCase).
#[wasm_bindgen(js_name = ulid_inspect)]
pub fn ulid_inspect_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: UlidInspectInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: UlidInspectOutput = ulid_inspect_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Text case converter. Receives CaseInput (camelCase) and returns CaseOutput (camelCase).
#[wasm_bindgen(js_name = case_process)]
pub fn case_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: CaseInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: CaseOutput = case_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// API key generation. Receives ApiKeyInput (camelCase) and returns ApiKeyOutput (camelCase).
#[wasm_bindgen(js_name = api_key_process)]
pub fn api_key_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: ApiKeyInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: ApiKeyOutput = api_key_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Word counter. Receives WordCounterInput (camelCase) and returns WordCounterOutput (camelCase).
#[wasm_bindgen(js_name = word_counter_process)]
pub fn word_counter_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: WordCounterInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: WordCounterOutput = word_counter_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// String escaper. Receives StringEscaperInput (camelCase) and returns StringEscaperOutput (camelCase).
#[wasm_bindgen(js_name = string_escaper_process)]
pub fn string_escaper_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: StringEscaperInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: StringEscaperOutput = string_escaper_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Find & replace. Receives FindReplaceInput (camelCase) and returns FindReplaceOutput (camelCase).
#[wasm_bindgen(js_name = find_replace_process)]
pub fn find_replace_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: FindReplaceInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: FindReplaceOutput = find_replace_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Lorem ipsum generator. Receives LoremIpsumInput (camelCase) and returns LoremIpsumOutput (camelCase).
#[wasm_bindgen(js_name = lorem_ipsum_process)]
pub fn lorem_ipsum_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: LoremIpsumInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: LoremIpsumOutput = lorem_ipsum_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Regex matcher. Receives RegexRequest (camelCase) and returns Vec<MatchResult> (camelCase).
#[wasm_bindgen(js_name = regex_match)]
pub fn regex_match_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: RegexRequest =
        from_value(js_input).map_err(|e| JsValue::from_str(&format!("Invalid request: {}", e)))?;
    let output: Vec<RegexMatchResult> =
        regex_router::run(&input).map_err(|e| JsValue::from_str(&e))?;
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Regex pattern explanation (HIR tokens). Receives ExplainRequest and returns Vec<ExplainToken>.
#[wasm_bindgen(js_name = regex_explain)]
pub fn regex_explain_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let req: ExplainRequest =
        from_value(js_input).map_err(|e| JsValue::from_str(&format!("Invalid request: {}", e)))?;
    let output: Vec<RegexExplainToken> =
        regex_core::explain::run(&req).map_err(|e| JsValue::from_str(&e))?;
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}
