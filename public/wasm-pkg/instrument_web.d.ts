/* tslint:disable */
/* eslint-disable */

export function aes_process(js_input: any): any;

export function api_key_process(js_input: any): any;

export function base64_process(js_input: any): any;

export function base_converter_process(js_input: any): any;

export function bitwise_process(js_input: any): any;

export function case_process(js_input: any): any;

export function cert_decode(js_input: any): any;

export function chmod_process(js_input: any): any;

export function cidr_calculate(js_input: any): any;

export function color_convert(js_input: any): any;

export function cron_process(js_input: any): any;

export function env_parse(js_input: any): any;

export function fake_data_process(js_input: any): any;

export function find_replace_process(js_input: any): any;

export function hash_process(js_input: any): any;

export function hex_process(js_input: any): any;

export function html_entity_process(js_input: any): any;

export function html_format(js_input: any): any;

export function iso8601_process(js_input: any): any;

export function line_tools_process(js_input: any): any;

export function lorem_ipsum_process(js_input: any): any;

export function nanoid_process(js_input: any): any;

export function passphrase_process(js_input: any): any;

export function password_process(js_input: any): any;

export function qr_generate(js_input: any): any;

/**
 * Regex pattern explanation (HIR tokens). Receives ExplainRequest and returns Vec<ExplainToken>.
 */
export function regex_explain(js_input: any): any;

/**
 * Regex matcher. Receives RegexRequest (camelCase) and returns Vec<MatchResult> (camelCase).
 */
export function regex_match(js_input: any): any;

export function semver_process(js_input: any): any;

export function string_escaper_process(js_input: any): any;

export function text_diff_process(js_input: any): any;

export function timestamp_process(js_input: any): any;

export function timezone_process(js_input: any): any;

export function tool_basic_auth(js_input: any): any;

export function tool_config_convert(js_input: any): any;

export function tool_csv_to_json(js_input: any): any;

export function tool_expression_eval(js_input: any): any;

export function tool_json_convert(js_input: any): any;

export function tool_json_diff(js_input: any): any;

export function tool_json_format(js_input: any): any;

export function tool_json_path(js_input: any): any;

export function tool_json_schema_validate(js_input: any): any;

export function tool_json_to_csv(js_input: any): any;

export function tool_json_validate(js_input: any): any;

export function tool_jwt_build(js_input: any): any;

export function tool_jwt_decode(js_input: any): any;

export function tool_slug_generate(js_input: any): any;

export function tool_sql_format(js_input: any): any;

export function tool_totp_generate(js_input: any): any;

export function tool_unicode_inspect(js_input: any): any;

export function tool_url_parse(js_input: any): any;

export function tool_xml_format(js_input: any): any;

export function tool_yaml_format(js_input: any): any;

export function ua_parse(js_input: any): any;

export function ulid_inspect(js_input: any): any;

export function ulid_process(js_input: any): any;

export function unit_convert(js_input: any): any;

export function url_encode_process(js_input: any): any;

export function uuid_inspect(js_input: any): any;

export function uuid_process(js_input: any): any;

export function word_counter_process(js_input: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly aes_process: (a: any) => [number, number, number];
    readonly api_key_process: (a: any) => [number, number, number];
    readonly base64_process: (a: any) => [number, number, number];
    readonly base_converter_process: (a: any) => [number, number, number];
    readonly bitwise_process: (a: any) => [number, number, number];
    readonly case_process: (a: any) => [number, number, number];
    readonly cert_decode: (a: any) => [number, number, number];
    readonly chmod_process: (a: any) => [number, number, number];
    readonly cidr_calculate: (a: any) => [number, number, number];
    readonly color_convert: (a: any) => [number, number, number];
    readonly cron_process: (a: any) => [number, number, number];
    readonly env_parse: (a: any) => [number, number, number];
    readonly fake_data_process: (a: any) => [number, number, number];
    readonly find_replace_process: (a: any) => [number, number, number];
    readonly hash_process: (a: any) => [number, number, number];
    readonly hex_process: (a: any) => [number, number, number];
    readonly html_entity_process: (a: any) => [number, number, number];
    readonly html_format: (a: any) => [number, number, number];
    readonly iso8601_process: (a: any) => [number, number, number];
    readonly line_tools_process: (a: any) => [number, number, number];
    readonly lorem_ipsum_process: (a: any) => [number, number, number];
    readonly nanoid_process: (a: any) => [number, number, number];
    readonly passphrase_process: (a: any) => [number, number, number];
    readonly password_process: (a: any) => [number, number, number];
    readonly qr_generate: (a: any) => [number, number, number];
    readonly regex_explain: (a: any) => [number, number, number];
    readonly regex_match: (a: any) => [number, number, number];
    readonly semver_process: (a: any) => [number, number, number];
    readonly string_escaper_process: (a: any) => [number, number, number];
    readonly text_diff_process: (a: any) => [number, number, number];
    readonly timestamp_process: (a: any) => [number, number, number];
    readonly timezone_process: (a: any) => [number, number, number];
    readonly tool_basic_auth: (a: any) => [number, number, number];
    readonly tool_config_convert: (a: any) => [number, number, number];
    readonly tool_csv_to_json: (a: any) => [number, number, number];
    readonly tool_expression_eval: (a: any) => [number, number, number];
    readonly tool_json_convert: (a: any) => [number, number, number];
    readonly tool_json_diff: (a: any) => [number, number, number];
    readonly tool_json_format: (a: any) => [number, number, number];
    readonly tool_json_path: (a: any) => [number, number, number];
    readonly tool_json_schema_validate: (a: any) => [number, number, number];
    readonly tool_json_to_csv: (a: any) => [number, number, number];
    readonly tool_json_validate: (a: any) => [number, number, number];
    readonly tool_jwt_build: (a: any) => [number, number, number];
    readonly tool_jwt_decode: (a: any) => [number, number, number];
    readonly tool_slug_generate: (a: any) => [number, number, number];
    readonly tool_sql_format: (a: any) => [number, number, number];
    readonly tool_totp_generate: (a: any) => [number, number, number];
    readonly tool_unicode_inspect: (a: any) => [number, number, number];
    readonly tool_url_parse: (a: any) => [number, number, number];
    readonly tool_xml_format: (a: any) => [number, number, number];
    readonly tool_yaml_format: (a: any) => [number, number, number];
    readonly ua_parse: (a: any) => [number, number, number];
    readonly ulid_inspect: (a: any) => [number, number, number];
    readonly ulid_process: (a: any) => [number, number, number];
    readonly unit_convert: (a: any) => [number, number, number];
    readonly url_encode_process: (a: any) => [number, number, number];
    readonly uuid_inspect: (a: any) => [number, number, number];
    readonly uuid_process: (a: any) => [number, number, number];
    readonly word_counter_process: (a: any) => [number, number, number];
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
