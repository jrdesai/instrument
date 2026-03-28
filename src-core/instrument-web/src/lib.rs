//! WASM bindings for Instrument tools. Each export mirrors a Tauri command or shared core API.

use instrument_core::crypto::hash::{process as hash_process_core, HashInput, HashOutput};
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
use instrument_core::text::diff::{
    process as text_diff_process_core, TextDiffInput, TextDiffOutput,
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
use instrument_core::crypto::passphrase::{
    process as passphrase_process_core, PassphraseInput, PassphraseOutput,
};
use instrument_core::crypto::password::{process as password_process_core, PasswordInput, PasswordOutput};
use instrument_core::crypto::nanoid::{
    process as nanoid_process_core, NanoIdInput, NanoIdOutput,
};
use instrument_core::crypto::aes::{process as aes_process_core, AesInput, AesOutput};
use instrument_core::auth::jwt_decoder::{
    process as jwt_decode_process_core, JwtDecodeInput, JwtDecodeOutput,
};
use instrument_core::auth::jwt_builder::{
    process as jwt_build_process_core, JwtBuildInput, JwtBuildOutput,
};
use instrument_core::json::formatter::{
    process as json_format_process_core, JsonFormatInput, JsonFormatOutput,
};
use instrument_core::json::validator::{
    process as json_validate_process_core, JsonValidateInput, JsonValidateOutput,
};
use instrument_core::json::diff::{
    process as json_diff_process_core, JsonDiffInput, JsonDiffOutput,
};
use instrument_core::json::path::{
    process as json_path_process_core, JsonPathInput, JsonPathOutput,
};
use instrument_core::json::converter::{
    process as json_convert_process_core, JsonConvertInput, JsonConvertOutput,
};
use instrument_core::json::yaml_to_json::{
    process as yaml_to_json_process_core, YamlToJsonInput, YamlToJsonOutput,
};
use instrument_core::datetime::timestamp::{
    process as timestamp_process_core, TimestampInput, TimestampOutput,
};
use instrument_core::datetime::timezone::{
    process as timezone_process_core, TimezoneInput, TimezoneOutput,
};
use instrument_core::datetime::cron::{
    process as cron_process_core, CronInput, CronOutput,
};
use instrument_core::datetime::iso8601::{
    process as iso8601_process_core, Iso8601Input, Iso8601Output,
};
use instrument_core::numbers::base_converter::{
    process as base_converter_process_core, BaseConverterInput, BaseConverterOutput,
};
use instrument_core::numbers::bitwise::{
    process as bitwise_process_core, BitwiseInput, BitwiseOutput,
};
use instrument_core::encoding::base64::{process, Base64Input};
use instrument_core::encoding::color::{process as color_process_core, ColorInput};
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

/// Colour converter. Receives ColorInput (camelCase) and returns ColorOutput (camelCase).
#[wasm_bindgen(js_name = color_convert)]
pub fn color_convert_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: ColorInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output = color_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Combined hash. Receives HashInput (camelCase) and returns HashOutput (camelCase).
#[wasm_bindgen(js_name = hash_process)]
pub fn hash_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: HashInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: HashOutput = hash_process_core(input);
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

/// Password generation. Receives PasswordInput (camelCase) and returns PasswordOutput (camelCase).
#[wasm_bindgen(js_name = password_process)]
pub fn password_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: PasswordInput = from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: PasswordOutput = password_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Passphrase generation. Receives PassphraseInput (camelCase) and returns PassphraseOutput (camelCase).
#[wasm_bindgen(js_name = passphrase_process)]
pub fn passphrase_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: PassphraseInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: PassphraseOutput = passphrase_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Nano ID generation. Receives NanoIdInput (camelCase) and returns NanoIdOutput (camelCase).
#[wasm_bindgen(js_name = nanoid_process)]
pub fn nanoid_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: NanoIdInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: NanoIdOutput = nanoid_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// AES-256-GCM encrypt/decrypt. Receives AesInput (camelCase) and returns AesOutput (camelCase).
#[wasm_bindgen(js_name = aes_process)]
pub fn aes_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: AesInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: AesOutput = aes_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// JWT decoder. Receives JwtDecodeInput (camelCase) and returns JwtDecodeOutput (camelCase).
#[wasm_bindgen(js_name = tool_jwt_decode)]
pub fn tool_jwt_decode_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: JwtDecodeInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: JwtDecodeOutput = jwt_decode_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// JWT builder. Receives JwtBuildInput (camelCase) and returns JwtBuildOutput (camelCase).
#[wasm_bindgen(js_name = tool_jwt_build)]
pub fn tool_jwt_build_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: JwtBuildInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: JwtBuildOutput = jwt_build_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// JSON formatter. Receives JsonFormatInput (camelCase) and returns JsonFormatOutput (camelCase).
#[wasm_bindgen(js_name = tool_json_format)]
pub fn tool_json_format_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: JsonFormatInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: JsonFormatOutput = json_format_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// JSON validator. Receives JsonValidateInput (camelCase) and returns JsonValidateOutput (camelCase).
#[wasm_bindgen(js_name = tool_json_validate)]
pub fn tool_json_validate_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: JsonValidateInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: JsonValidateOutput = json_validate_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// JSON diff. Receives JsonDiffInput (camelCase) and returns JsonDiffOutput (camelCase).
#[wasm_bindgen(js_name = tool_json_diff)]
pub fn tool_json_diff_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: JsonDiffInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: JsonDiffOutput = json_diff_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// JSON path query. Receives JsonPathInput (camelCase) and returns JsonPathOutput (camelCase).
#[wasm_bindgen(js_name = tool_json_path)]
pub fn tool_json_path_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: JsonPathInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: JsonPathOutput = json_path_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// JSON converter. Receives JsonConvertInput (camelCase) and returns JsonConvertOutput (camelCase).
#[wasm_bindgen(js_name = tool_json_convert)]
pub fn tool_json_convert_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: JsonConvertInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: JsonConvertOutput = json_convert_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// YAML to JSON converter. Receives YamlToJsonInput (camelCase) and returns YamlToJsonOutput (camelCase).
#[wasm_bindgen(js_name = tool_yaml_to_json)]
pub fn tool_yaml_to_json_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: YamlToJsonInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: YamlToJsonOutput = yaml_to_json_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Timestamp converter. Receives TimestampInput (camelCase) and returns TimestampOutput (camelCase).
#[wasm_bindgen(js_name = timestamp_process)]
pub fn timestamp_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: TimestampInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: TimestampOutput = timestamp_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Timezone converter. Receives TimezoneInput (camelCase) and returns TimezoneOutput (camelCase).
#[wasm_bindgen(js_name = timezone_process)]
pub fn timezone_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: TimezoneInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: TimezoneOutput = timezone_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// ISO 8601 formatter. Receives Iso8601Input (camelCase) and returns Iso8601Output (camelCase).
#[wasm_bindgen(js_name = iso8601_process)]
pub fn iso8601_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: Iso8601Input =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: Iso8601Output = iso8601_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Cron expression parser. Receives CronInput (camelCase) and returns CronOutput (camelCase).
#[wasm_bindgen(js_name = cron_process)]
pub fn cron_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: CronInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: CronOutput = cron_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Number base converter. Receives BaseConverterInput (camelCase) and returns BaseConverterOutput (camelCase).
#[wasm_bindgen(js_name = base_converter_process)]
pub fn base_converter_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: BaseConverterInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: BaseConverterOutput = base_converter_process_core(input);
    to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Bitwise calculator. Receives BitwiseInput (camelCase) and returns BitwiseOutput (camelCase).
#[wasm_bindgen(js_name = bitwise_process)]
pub fn bitwise_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: BitwiseInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: BitwiseOutput = bitwise_process_core(input);
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

/// Text diff. Receives TextDiffInput (camelCase) and returns TextDiffOutput (camelCase).
#[wasm_bindgen(js_name = text_diff_process)]
pub fn text_diff_process_wasm(js_input: JsValue) -> Result<JsValue, JsValue> {
    let input: TextDiffInput =
        from_value(js_input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let output: TextDiffOutput = text_diff_process_core(input);
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
