/* tslint:disable */
/* eslint-disable */

/**
 * AES-256-GCM encrypt/decrypt. Receives AesInput (camelCase) and returns AesOutput (camelCase).
 */
export function aes_process(js_input: any): any;

/**
 * API key generation. Receives ApiKeyInput (camelCase) and returns ApiKeyOutput (camelCase).
 */
export function api_key_process(js_input: any): any;

/**
 * Base64 encode/decode. Receives a Base64Input (camelCase) and returns a Base64Output (camelCase).
 */
export function base64_process(js_input: any): any;

/**
 * Number base converter. Receives BaseConverterInput (camelCase) and returns BaseConverterOutput (camelCase).
 */
export function base_converter_process(js_input: any): any;

/**
 * Bitwise calculator. Receives BitwiseInput (camelCase) and returns BitwiseOutput (camelCase).
 */
export function bitwise_process(js_input: any): any;

/**
 * Text case converter. Receives CaseInput (camelCase) and returns CaseOutput (camelCase).
 */
export function case_process(js_input: any): any;

/**
 * Colour converter. Receives ColorInput (camelCase) and returns ColorOutput (camelCase).
 */
export function color_convert(js_input: any): any;

/**
 * Cron expression parser. Receives CronInput (camelCase) and returns CronOutput (camelCase).
 */
export function cron_process(js_input: any): any;

/**
 * Find & replace. Receives FindReplaceInput (camelCase) and returns FindReplaceOutput (camelCase).
 */
export function find_replace_process(js_input: any): any;

/**
 * Combined hash. Receives HashInput (camelCase) and returns HashOutput (camelCase).
 */
export function hash_process(js_input: any): any;

/**
 * Hex encode/decode. Receives HexInput (camelCase) and returns HexOutput (camelCase).
 */
export function hex_process(js_input: any): any;

/**
 * HTML entity encode/decode. Receives HtmlEntityInput (camelCase) and returns HtmlEntityOutput (camelCase).
 */
export function html_entity_process(js_input: any): any;

/**
 * ISO 8601 formatter. Receives Iso8601Input (camelCase) and returns Iso8601Output (camelCase).
 */
export function iso8601_process(js_input: any): any;

/**
 * Lorem ipsum generator. Receives LoremIpsumInput (camelCase) and returns LoremIpsumOutput (camelCase).
 */
export function lorem_ipsum_process(js_input: any): any;

/**
 * Nano ID generation. Receives NanoIdInput (camelCase) and returns NanoIdOutput (camelCase).
 */
export function nanoid_process(js_input: any): any;

/**
 * Passphrase generation. Receives PassphraseInput (camelCase) and returns PassphraseOutput (camelCase).
 */
export function passphrase_process(js_input: any): any;

/**
 * Password generation. Receives PasswordInput (camelCase) and returns PasswordOutput (camelCase).
 */
export function password_process(js_input: any): any;

/**
 * Regex pattern explanation (HIR tokens). Receives ExplainRequest and returns Vec<ExplainToken>.
 */
export function regex_explain(js_input: any): any;

/**
 * Regex matcher. Receives RegexRequest (camelCase) and returns Vec<MatchResult> (camelCase).
 */
export function regex_match(js_input: any): any;

/**
 * String escaper. Receives StringEscaperInput (camelCase) and returns StringEscaperOutput (camelCase).
 */
export function string_escaper_process(js_input: any): any;

/**
 * Text diff. Receives TextDiffInput (camelCase) and returns TextDiffOutput (camelCase).
 */
export function text_diff_process(js_input: any): any;

/**
 * Timestamp converter. Receives TimestampInput (camelCase) and returns TimestampOutput (camelCase).
 */
export function timestamp_process(js_input: any): any;

/**
 * Timezone converter. Receives TimezoneInput (camelCase) and returns TimezoneOutput (camelCase).
 */
export function timezone_process(js_input: any): any;

/**
 * Config converter (JSON ↔ YAML ↔ TOML). Receives ConfigConvertInput and returns ConfigConvertOutput (camelCase).
 */
export function tool_config_convert(js_input: any): any;

/**
 * CSV → JSON converter. Receives CsvToJsonInput (camelCase) and returns CsvToJsonOutput (camelCase).
 */
export function tool_csv_to_json(js_input: any): any;

/**
 * Expression evaluator. Receives ExprEvalInput (camelCase) and returns ExprEvalOutput (camelCase).
 */
export function tool_expression_eval(js_input: any): any;

/**
 * JSON converter. Receives JsonConvertInput (camelCase) and returns JsonConvertOutput (camelCase).
 */
export function tool_json_convert(js_input: any): any;

/**
 * JSON diff. Receives JsonDiffInput (camelCase) and returns JsonDiffOutput (camelCase).
 */
export function tool_json_diff(js_input: any): any;

/**
 * JSON formatter. Receives JsonFormatInput (camelCase) and returns JsonFormatOutput (camelCase).
 */
export function tool_json_format(js_input: any): any;

/**
 * JSON path query. Receives JsonPathInput (camelCase) and returns JsonPathOutput (camelCase).
 */
export function tool_json_path(js_input: any): any;

/**
 * JSON validator. Receives JsonValidateInput (camelCase) and returns JsonValidateOutput (camelCase).
 */
export function tool_json_validate(js_input: any): any;

/**
 * JWT builder. Receives JwtBuildInput (camelCase) and returns JwtBuildOutput (camelCase).
 */
export function tool_jwt_build(js_input: any): any;

/**
 * JWT decoder. Receives JwtDecodeInput (camelCase) and returns JwtDecodeOutput (camelCase).
 */
export function tool_jwt_decode(js_input: any): any;

/**
 * SQL formatter. Receives SqlFormatInput (camelCase) and returns SqlFormatOutput (camelCase).
 */
export function tool_sql_format(js_input: any): any;

/**
 * URL parser. Receives UrlParseInput (camelCase) and returns UrlParseOutput (camelCase).
 */
export function tool_url_parse(js_input: any): any;

/**
 * ULID inspection. Receives UlidInspectInput (camelCase) and returns UlidInspectOutput (camelCase).
 */
export function ulid_inspect(js_input: any): any;

/**
 * ULID generation. Receives UlidInput (camelCase) and returns UlidOutput (camelCase).
 */
export function ulid_process(js_input: any): any;

/**
 * URL percent-encode/decode. Receives UrlEncodeInput (camelCase) and returns UrlEncodeOutput (camelCase).
 */
export function url_encode_process(js_input: any): any;

/**
 * UUID inspection. Receives UuidInspectInput (camelCase) and returns UuidInspectOutput (camelCase).
 */
export function uuid_inspect(js_input: any): any;

/**
 * UUID generation. Receives UuidInput (camelCase) and returns UuidOutput (camelCase).
 */
export function uuid_process(js_input: any): any;

/**
 * Word counter. Receives WordCounterInput (camelCase) and returns WordCounterOutput (camelCase).
 */
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
    readonly color_convert: (a: any) => [number, number, number];
    readonly cron_process: (a: any) => [number, number, number];
    readonly find_replace_process: (a: any) => [number, number, number];
    readonly hash_process: (a: any) => [number, number, number];
    readonly hex_process: (a: any) => [number, number, number];
    readonly html_entity_process: (a: any) => [number, number, number];
    readonly iso8601_process: (a: any) => [number, number, number];
    readonly lorem_ipsum_process: (a: any) => [number, number, number];
    readonly nanoid_process: (a: any) => [number, number, number];
    readonly passphrase_process: (a: any) => [number, number, number];
    readonly password_process: (a: any) => [number, number, number];
    readonly regex_explain: (a: any) => [number, number, number];
    readonly regex_match: (a: any) => [number, number, number];
    readonly string_escaper_process: (a: any) => [number, number, number];
    readonly text_diff_process: (a: any) => [number, number, number];
    readonly timestamp_process: (a: any) => [number, number, number];
    readonly timezone_process: (a: any) => [number, number, number];
    readonly tool_config_convert: (a: any) => [number, number, number];
    readonly tool_csv_to_json: (a: any) => [number, number, number];
    readonly tool_expression_eval: (a: any) => [number, number, number];
    readonly tool_json_convert: (a: any) => [number, number, number];
    readonly tool_json_diff: (a: any) => [number, number, number];
    readonly tool_json_format: (a: any) => [number, number, number];
    readonly tool_json_path: (a: any) => [number, number, number];
    readonly tool_json_validate: (a: any) => [number, number, number];
    readonly tool_jwt_build: (a: any) => [number, number, number];
    readonly tool_jwt_decode: (a: any) => [number, number, number];
    readonly tool_sql_format: (a: any) => [number, number, number];
    readonly tool_url_parse: (a: any) => [number, number, number];
    readonly ulid_inspect: (a: any) => [number, number, number];
    readonly ulid_process: (a: any) => [number, number, number];
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
