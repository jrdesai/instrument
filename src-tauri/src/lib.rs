// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            instrument_desktop::commands::auth::tool_jwt_decode,
            instrument_desktop::commands::auth::tool_jwt_build,
            instrument_desktop::commands::crypto::md5_process,
            instrument_desktop::commands::crypto::sha256_process,
            instrument_desktop::commands::crypto::sha512_process,
            instrument_desktop::commands::crypto::ulid_process,
            instrument_desktop::commands::crypto::ulid_inspect,
            instrument_desktop::commands::crypto::uuid_process,
            instrument_desktop::commands::crypto::uuid_inspect,
            instrument_desktop::commands::crypto::api_key_process,
            instrument_desktop::commands::text::case_process,
            instrument_desktop::commands::text::word_counter_process,
            instrument_desktop::commands::text::string_escaper_process,
            instrument_desktop::commands::text::find_replace_process,
            instrument_desktop::commands::text::lorem_ipsum_process,
            instrument_desktop::commands::datetime::timestamp_process,
            instrument_desktop::commands::datetime::timezone_process,
            instrument_desktop::commands::datetime::iso8601_process,
            instrument_desktop::commands::encoding::base64_process,
            instrument_desktop::commands::encoding::url_encode_process,
            instrument_desktop::commands::encoding::html_entity_process,
            instrument_desktop::commands::encoding::hex_process,
            instrument_desktop::commands::json::tool_json_format,
            instrument_desktop::commands::json::tool_json_validate,
            instrument_desktop::commands::json::tool_json_diff,
            instrument_desktop::commands::json::tool_json_path,
            instrument_desktop::commands::json::tool_json_convert,
            instrument_desktop::commands::json::tool_yaml_to_json,
            instrument_desktop::commands::network::tool_url_parse,
            instrument_desktop::commands::numbers::base_converter_process,
            instrument_desktop::commands::numbers::bitwise_process,
            instrument_desktop::commands::regex::tool_regex_test,
            instrument_desktop::commands::regex::tool_regex_explain,
            instrument_desktop::commands::sql::tool_sql_format,
            instrument_desktop::commands::csv::tool_csv_to_json,
            instrument_desktop::commands::expression::tool_expression_eval,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
