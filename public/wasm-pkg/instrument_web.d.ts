/* tslint:disable */
/* eslint-disable */

/**
 * Regex pattern explanation (HIR tokens). Receives ExplainRequest and returns Vec<ExplainToken>.
 */
export function regex_explain(js_input: any): any;

/**
 * Regex matcher. Receives RegexRequest (camelCase) and returns Vec<MatchResult> (camelCase).
 */
export function regex_match(js_input: any): any;

export function tool_aes_process(js_input: any): any;

export function tool_api_key_process(js_input: any): any;

export function tool_base64_process(js_input: any): any;

export function tool_base_converter_process(js_input: any): any;

export function tool_basic_auth(js_input: any): any;

export function tool_bitwise_process(js_input: any): any;

export function tool_case_process(js_input: any): any;

export function tool_cert_decode(js_input: any): any;

export function tool_chmod_process(js_input: any): any;

export function tool_cidr_calculate(js_input: any): any;

export function tool_color_convert(js_input: any): any;

export function tool_config_convert(js_input: any): any;

export function tool_cron_process(js_input: any): any;

export function tool_csv_preview(js_input: any): any;

export function tool_csv_to_json(js_input: any): any;

export function tool_env_parse(js_input: any): any;

export function tool_expression_eval(js_input: any): any;

export function tool_fake_data_process(js_input: any): any;

export function tool_find_replace_process(js_input: any): any;

export function tool_hash_process(js_input: any): any;

export function tool_hex_process(js_input: any): any;

export function tool_html_entity_process(js_input: any): any;

export function tool_html_format(js_input: any): any;

export function tool_iso8601_process(js_input: any): any;

export function tool_json_convert(js_input: any): any;

export function tool_json_diff(js_input: any): any;

export function tool_json_format(js_input: any): any;

export function tool_json_path(js_input: any): any;

export function tool_json_schema_validate(js_input: any): any;

export function tool_json_to_csv(js_input: any): any;

export function tool_json_validate(js_input: any): any;

export function tool_jwt_build(js_input: any): any;

export function tool_jwt_decode(js_input: any): any;

export function tool_line_tools_process(js_input: any): any;

export function tool_lorem_ipsum_process(js_input: any): any;

export function tool_nanoid_process(js_input: any): any;

export function tool_nato_phonetic_process(js_input: any): any;

export function tool_passphrase_process(js_input: any): any;

export function tool_password_process(js_input: any): any;

export function tool_qr_generate(js_input: any): any;

export function tool_semver_process(js_input: any): any;

export function tool_slug_generate(js_input: any): any;

export function tool_sql_format(js_input: any): any;

export function tool_string_escaper_process(js_input: any): any;

export function tool_text_diff_process(js_input: any): any;

export function tool_timestamp_process(js_input: any): any;

export function tool_timezone_process(js_input: any): any;

export function tool_totp_generate(js_input: any): any;

export function tool_ua_parse(js_input: any): any;

export function tool_ulid_inspect(js_input: any): any;

export function tool_ulid_process(js_input: any): any;

export function tool_unicode_inspect(js_input: any): any;

export function tool_unit_convert(js_input: any): any;

export function tool_url_encode_process(js_input: any): any;

export function tool_url_parse(js_input: any): any;

export function tool_uuid_inspect(js_input: any): any;

export function tool_uuid_process(js_input: any): any;

export function tool_word_counter_process(js_input: any): any;

export function tool_xml_format(js_input: any): any;

export function tool_yaml_format(js_input: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly regex_explain: (a: any) => [number, number, number];
    readonly regex_match: (a: any) => [number, number, number];
    readonly tool_aes_process: (a: any) => [number, number, number];
    readonly tool_api_key_process: (a: any) => [number, number, number];
    readonly tool_base64_process: (a: any) => [number, number, number];
    readonly tool_base_converter_process: (a: any) => [number, number, number];
    readonly tool_basic_auth: (a: any) => [number, number, number];
    readonly tool_bitwise_process: (a: any) => [number, number, number];
    readonly tool_case_process: (a: any) => [number, number, number];
    readonly tool_cert_decode: (a: any) => [number, number, number];
    readonly tool_chmod_process: (a: any) => [number, number, number];
    readonly tool_cidr_calculate: (a: any) => [number, number, number];
    readonly tool_color_convert: (a: any) => [number, number, number];
    readonly tool_config_convert: (a: any) => [number, number, number];
    readonly tool_cron_process: (a: any) => [number, number, number];
    readonly tool_csv_preview: (a: any) => [number, number, number];
    readonly tool_csv_to_json: (a: any) => [number, number, number];
    readonly tool_env_parse: (a: any) => [number, number, number];
    readonly tool_expression_eval: (a: any) => [number, number, number];
    readonly tool_fake_data_process: (a: any) => [number, number, number];
    readonly tool_find_replace_process: (a: any) => [number, number, number];
    readonly tool_hash_process: (a: any) => [number, number, number];
    readonly tool_hex_process: (a: any) => [number, number, number];
    readonly tool_html_entity_process: (a: any) => [number, number, number];
    readonly tool_html_format: (a: any) => [number, number, number];
    readonly tool_iso8601_process: (a: any) => [number, number, number];
    readonly tool_json_convert: (a: any) => [number, number, number];
    readonly tool_json_diff: (a: any) => [number, number, number];
    readonly tool_json_format: (a: any) => [number, number, number];
    readonly tool_json_path: (a: any) => [number, number, number];
    readonly tool_json_schema_validate: (a: any) => [number, number, number];
    readonly tool_json_to_csv: (a: any) => [number, number, number];
    readonly tool_json_validate: (a: any) => [number, number, number];
    readonly tool_jwt_build: (a: any) => [number, number, number];
    readonly tool_jwt_decode: (a: any) => [number, number, number];
    readonly tool_line_tools_process: (a: any) => [number, number, number];
    readonly tool_lorem_ipsum_process: (a: any) => [number, number, number];
    readonly tool_nanoid_process: (a: any) => [number, number, number];
    readonly tool_nato_phonetic_process: (a: any) => [number, number, number];
    readonly tool_passphrase_process: (a: any) => [number, number, number];
    readonly tool_password_process: (a: any) => [number, number, number];
    readonly tool_qr_generate: (a: any) => [number, number, number];
    readonly tool_semver_process: (a: any) => [number, number, number];
    readonly tool_slug_generate: (a: any) => [number, number, number];
    readonly tool_sql_format: (a: any) => [number, number, number];
    readonly tool_string_escaper_process: (a: any) => [number, number, number];
    readonly tool_text_diff_process: (a: any) => [number, number, number];
    readonly tool_timestamp_process: (a: any) => [number, number, number];
    readonly tool_timezone_process: (a: any) => [number, number, number];
    readonly tool_totp_generate: (a: any) => [number, number, number];
    readonly tool_ua_parse: (a: any) => [number, number, number];
    readonly tool_ulid_inspect: (a: any) => [number, number, number];
    readonly tool_ulid_process: (a: any) => [number, number, number];
    readonly tool_unicode_inspect: (a: any) => [number, number, number];
    readonly tool_unit_convert: (a: any) => [number, number, number];
    readonly tool_url_encode_process: (a: any) => [number, number, number];
    readonly tool_url_parse: (a: any) => [number, number, number];
    readonly tool_uuid_inspect: (a: any) => [number, number, number];
    readonly tool_uuid_process: (a: any) => [number, number, number];
    readonly tool_word_counter_process: (a: any) => [number, number, number];
    readonly tool_xml_format: (a: any) => [number, number, number];
    readonly tool_yaml_format: (a: any) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
