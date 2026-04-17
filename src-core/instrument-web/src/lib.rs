//! WASM bindings for Instrument tools. Each export mirrors a Tauri command or shared core API.

use instrument_core::auth::basic_auth::{
    process as basic_auth_core, BasicAuthInput,
};
use instrument_core::auth::jwt_builder::{
    process as jwt_build_process_core, JwtBuildInput,
};
use instrument_core::auth::jwt_decoder::{
    process as jwt_decode_process_core, JwtDecodeInput,
};
use instrument_core::crypto::aes::{process as aes_process_core, AesInput};
use instrument_core::crypto::api_key::{
    process as api_key_process_core, ApiKeyInput,
};
use instrument_core::crypto::cert::{
    process as cert_decode_core, CertDecodeInput,
};
use instrument_core::crypto::hash::{process as hash_process_core, HashInput};
use instrument_core::crypto::nanoid::{process as nanoid_process_core, NanoIdInput};
use instrument_core::crypto::passphrase::{
    process as passphrase_process_core, PassphraseInput,
};
use instrument_core::crypto::password::{
    process as password_process_core, PasswordInput,
};
use instrument_core::crypto::totp::{process as totp_process_core, TotpInput};
use instrument_core::crypto::ulid::{
    inspect as ulid_inspect_core, process as ulid_process_core, UlidInput, UlidInspectInput,
};
use instrument_core::crypto::uuid_gen::{
    inspect as uuid_inspect_core, process as uuid_process_core, UuidInput, UuidInspectInput,
};
use instrument_core::csv::{
    process as csv_to_json_process_core, process_json_to_csv as json_to_csv_process_core,
    CsvToJsonInput, JsonToCsvInput,
};
use instrument_core::csv::preview::{process as csv_preview_core, CsvPreviewInput};
use instrument_core::datetime::cron::{process as cron_process_core, CronInput};
use instrument_core::datetime::iso8601::{
    process as iso8601_process_core, Iso8601Input,
};
use instrument_core::datetime::timestamp::{
    process as timestamp_process_core, TimestampInput,
};
use instrument_core::datetime::timezone::{
    process as timezone_process_core, TimezoneInput,
};
use instrument_core::encoding::base64::{process, Base64Input};
use instrument_core::encoding::color::{process as color_process_core, ColorInput};
use instrument_core::encoding::hex::{process as hex_process_core, HexInput};
use instrument_core::encoding::html_entity::{
    process as html_entity_process_core, HtmlEntityInput,
};
use instrument_core::encoding::qrcode::{process as qr_process_core, QrCodeInput};
use instrument_core::encoding::url::{process as url_process, UrlEncodeInput};
use instrument_core::expression::{
    process as expression_eval_process_core, ExprEvalInput,
};
use instrument_core::json::config_converter::{
    process as config_convert_core, ConfigConvertInput,
};
use instrument_core::json::converter::{
    process as json_convert_process_core, JsonConvertInput,
};
use instrument_core::json::diff::{
    process as json_diff_process_core, JsonDiffInput,
};
use instrument_core::json::formatter::{
    process as json_format_process_core, JsonFormatInput,
};
use instrument_core::json::path::{
    process as json_path_process_core, JsonPathInput,
};
use instrument_core::json::schema_validator::{
    process as json_schema_validate_core, JsonSchemaValidateInput,
};
use instrument_core::json::validator::{
    process as json_validate_process_core, JsonValidateInput,
};
use instrument_core::network::cidr::{process as cidr_process_core, CidrInput};
use instrument_core::network::user_agent::{
    process as ua_parse_process_core, UaParseInput,
};
use instrument_core::network::{process as url_parse_process, UrlParseInput};
use instrument_core::numbers::base_converter::{
    process as base_converter_process_core, BaseConverterInput,
};
use instrument_core::numbers::bitwise::{
    process as bitwise_process_core, BitwiseInput,
};
use instrument_core::numbers::chmod::{process as chmod_process_core, ChmodInput};
use instrument_core::numbers::color_contrast::{
    process as color_contrast_process_core, ColorContrastInput,
};
use instrument_core::numbers::semver::{process as semver_process_core, SemverInput};
use instrument_core::numbers::unit_converter::{
    process as unit_convert_core, UnitConverterInput,
};
use instrument_core::sql::{process as sql_format_process_core, SqlFormatInput};
use instrument_core::text::case::{process as case_process_core, CaseInput};
use instrument_core::text::diff::{
    process as text_diff_process_core, TextDiffInput,
};
use instrument_core::text::env_parser::{
    process as env_parse_process_core, EnvParseInput,
};
use instrument_core::text::find_replace::{
    process as find_replace_process_core, FindReplaceInput,
};
use instrument_core::text::line_tools::{
    process as line_tools_process_core, LineToolsInput,
};
use instrument_core::text::lorem_ipsum::{
    process as lorem_ipsum_process_core, LoremIpsumInput,
};
use instrument_core::text::nato_phonetic::{
    process as nato_phonetic_process_core, NatoPhoneticInput,
};
use instrument_core::text::slug::{process as slug_generate_core, SlugInput};
use instrument_core::text::string_escaper::{
    process as string_escaper_process_core, StringEscaperInput,
};
use instrument_core::text::unicode::{
    process as unicode_inspect_core, UnicodeInspectInput,
};
use instrument_core::text::word_counter::{
    process as word_counter_process_core, WordCounterInput,
};
use instrument_core::text::fake_data::{
    process as fake_data_process_core, FakeDataInput,
};
use instrument_core::html::{process as html_format_process_core, HtmlFormatInput};
use instrument_core::xml::{process as xml_format_process_core, XmlFormatInput};
use instrument_core::yaml_fmt::{
    process as yaml_format_process_core, YamlFormatInput,
};
use regex_core::router as regex_router;
use regex_core::types::{
    ExplainRequest, ExplainToken as RegexExplainToken, MatchResult as RegexMatchResult,
    RegexRequest,
};
use serde_wasm_bindgen::{from_value, to_value};
use wasm_bindgen::prelude::*;

/// Generates a wasm-bindgen export for a tool that takes a single serialisable
/// input and returns a single serialisable output.
///
/// Usage:
///   tool_binding!(js_name_str, wasm_fn_ident, InputType, core_fn_path);
macro_rules! tool_binding {
    ($js_name:literal, $fn_name:ident, $input_ty:ty, $core_fn:path) => {
        #[wasm_bindgen(js_name = $js_name)]
        pub fn $fn_name(js_input: JsValue) -> Result<JsValue, JsValue> {
            let input: $input_ty = from_value(js_input)
                .map_err(|e| JsValue::from_str(&e.to_string()))?;
            let output = $core_fn(input);
            to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
        }
    };
}

tool_binding!("tool_base64_process", base64_process_wasm, Base64Input, process);
tool_binding!("tool_url_encode_process", url_encode_process_wasm, UrlEncodeInput, url_process);
tool_binding!("tool_url_parse", tool_url_parse_wasm, UrlParseInput, url_parse_process);
tool_binding!("tool_cidr_calculate", cidr_calculate_wasm, CidrInput, cidr_process_core);
tool_binding!("tool_ua_parse", ua_parse_wasm, UaParseInput, ua_parse_process_core);
tool_binding!("tool_csv_to_json", tool_csv_to_json_wasm, CsvToJsonInput, csv_to_json_process_core);
tool_binding!("tool_json_to_csv", tool_json_to_csv_wasm, JsonToCsvInput, json_to_csv_process_core);
tool_binding!("tool_csv_preview", tool_csv_preview_wasm, CsvPreviewInput, csv_preview_core);
tool_binding!("tool_html_format", html_format_wasm, HtmlFormatInput, html_format_process_core);
tool_binding!("tool_xml_format", tool_xml_format_wasm, XmlFormatInput, xml_format_process_core);
tool_binding!("tool_yaml_format", tool_yaml_format_wasm, YamlFormatInput, yaml_format_process_core);
tool_binding!("tool_sql_format", tool_sql_format_wasm, SqlFormatInput, sql_format_process_core);
tool_binding!(
    "tool_expression_eval",
    tool_expression_eval_wasm,
    ExprEvalInput,
    expression_eval_process_core
);
tool_binding!("tool_html_entity_process", html_entity_process_wasm, HtmlEntityInput, html_entity_process_core);
tool_binding!("tool_hex_process", hex_process_wasm, HexInput, hex_process_core);
tool_binding!("tool_color_convert", color_convert_wasm, ColorInput, color_process_core);
tool_binding!("tool_qr_generate", qr_generate_wasm, QrCodeInput, qr_process_core);
tool_binding!("tool_hash_process", hash_process_wasm, HashInput, hash_process_core);
tool_binding!("tool_uuid_process", uuid_process_wasm, UuidInput, uuid_process_core);
tool_binding!("tool_uuid_inspect", uuid_inspect_wasm, UuidInspectInput, uuid_inspect_core);
tool_binding!("tool_ulid_process", ulid_process_wasm, UlidInput, ulid_process_core);
tool_binding!("tool_ulid_inspect", ulid_inspect_wasm, UlidInspectInput, ulid_inspect_core);
tool_binding!("tool_case_process", case_process_wasm, CaseInput, case_process_core);
tool_binding!("tool_api_key_process", api_key_process_wasm, ApiKeyInput, api_key_process_core);
tool_binding!("tool_cert_decode", cert_decode_wasm, CertDecodeInput, cert_decode_core);
tool_binding!("tool_password_process", password_process_wasm, PasswordInput, password_process_core);
tool_binding!("tool_passphrase_process", passphrase_process_wasm, PassphraseInput, passphrase_process_core);
tool_binding!("tool_nanoid_process", nanoid_process_wasm, NanoIdInput, nanoid_process_core);
tool_binding!("tool_aes_process", aes_process_wasm, AesInput, aes_process_core);
tool_binding!("tool_totp_generate", tool_totp_generate_wasm, TotpInput, totp_process_core);
tool_binding!("tool_jwt_decode", tool_jwt_decode_wasm, JwtDecodeInput, jwt_decode_process_core);
tool_binding!("tool_jwt_build", tool_jwt_build_wasm, JwtBuildInput, jwt_build_process_core);
tool_binding!("tool_basic_auth", tool_basic_auth_wasm, BasicAuthInput, basic_auth_core);
tool_binding!("tool_json_format", tool_json_format_wasm, JsonFormatInput, json_format_process_core);
tool_binding!("tool_json_validate", tool_json_validate_wasm, JsonValidateInput, json_validate_process_core);
tool_binding!(
    "tool_json_schema_validate",
    tool_json_schema_validate_wasm,
    JsonSchemaValidateInput,
    json_schema_validate_core
);
tool_binding!("tool_json_diff", tool_json_diff_wasm, JsonDiffInput, json_diff_process_core);
tool_binding!("tool_json_path", tool_json_path_wasm, JsonPathInput, json_path_process_core);
tool_binding!("tool_json_convert", tool_json_convert_wasm, JsonConvertInput, json_convert_process_core);
tool_binding!("tool_config_convert", tool_config_convert_wasm, ConfigConvertInput, config_convert_core);
tool_binding!("tool_timestamp_process", timestamp_process_wasm, TimestampInput, timestamp_process_core);
tool_binding!("tool_timezone_process", timezone_process_wasm, TimezoneInput, timezone_process_core);
tool_binding!("tool_iso8601_process", iso8601_process_wasm, Iso8601Input, iso8601_process_core);
tool_binding!("tool_cron_process", cron_process_wasm, CronInput, cron_process_core);
tool_binding!(
    "tool_base_converter_process",
    base_converter_process_wasm,
    BaseConverterInput,
    base_converter_process_core
);
tool_binding!("tool_bitwise_process", bitwise_process_wasm, BitwiseInput, bitwise_process_core);
tool_binding!("tool_chmod_process", chmod_process_wasm, ChmodInput, chmod_process_core);
tool_binding!(
    "tool_color_contrast_process",
    color_contrast_process_wasm,
    ColorContrastInput,
    color_contrast_process_core
);
tool_binding!("tool_semver_process", semver_process_wasm, SemverInput, semver_process_core);
tool_binding!("tool_unit_convert", unit_convert_wasm, UnitConverterInput, unit_convert_core);
tool_binding!("tool_word_counter_process", word_counter_process_wasm, WordCounterInput, word_counter_process_core);
tool_binding!("tool_fake_data_process", fake_data_process_wasm, FakeDataInput, fake_data_process_core);
tool_binding!(
    "tool_unicode_inspect",
    tool_unicode_inspect_wasm,
    UnicodeInspectInput,
    unicode_inspect_core
);
tool_binding!("tool_slug_generate", tool_slug_generate_wasm, SlugInput, slug_generate_core);
tool_binding!(
    "tool_nato_phonetic_process",
    tool_nato_phonetic_process_wasm,
    NatoPhoneticInput,
    nato_phonetic_process_core
);
tool_binding!(
    "tool_string_escaper_process",
    string_escaper_process_wasm,
    StringEscaperInput,
    string_escaper_process_core
);
tool_binding!("tool_find_replace_process", find_replace_process_wasm, FindReplaceInput, find_replace_process_core);
tool_binding!("tool_text_diff_process", text_diff_process_wasm, TextDiffInput, text_diff_process_core);
tool_binding!("tool_line_tools_process", line_tools_process_wasm, LineToolsInput, line_tools_process_core);
tool_binding!("tool_env_parse", env_parse_wasm, EnvParseInput, env_parse_process_core);
tool_binding!("tool_lorem_ipsum_process", lorem_ipsum_process_wasm, LoremIpsumInput, lorem_ipsum_process_core);

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
