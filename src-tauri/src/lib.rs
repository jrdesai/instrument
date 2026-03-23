// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            // Logging strategy (two targets, different verbosity):
            //
            //   Stdout  — DEBUG+  for instrument_desktop, WARN+ for everything else.
            //             Shows every tool call timing in the terminal during `pnpm tauri dev`.
            //             Useful for active debugging sessions.
            //
            //   Log file — WARN+  only (platform log directory, 5 MB cap, single rotating file).
            //             Keeps the persistent log clean: only slow calls (>200ms) and errors
            //             are recorded. Fast auto-run tool completions are intentionally silent
            //             — they fire on every keystroke and would flood the file with noise.
            //
            //   Privacy: tool names and durations are logged; input/output values are NEVER
            //             logged anywhere. See src-core/instrument-desktop/src/command_log.rs.
            tauri_plugin_log::Builder::new()
                .targets([
                    // Terminal: full DEBUG output for instrument_desktop
                    Target::new(TargetKind::Stdout)
                        .filter(|m| {
                            m.level() <= log::Level::Warn
                                || m.target().starts_with("instrument_desktop")
                        }),
                    // File: WARN+ only — anomalies (slow calls, errors) and startup
                    Target::new(TargetKind::LogDir {
                        file_name: Some("instrument".into()),
                    })
                    .filter(|m| m.level() <= log::Level::Warn),
                ])
                .rotation_strategy(RotationStrategy::KeepOne)
                .max_file_size(5_000_000)
                // Global floor: suppress tao/wry TRACE/DEBUG noise (window focus events etc.)
                // instrument_desktop is allowed through to DEBUG by the Stdout target filter above.
                .level(log::LevelFilter::Warn)
                .level_for("instrument_desktop", log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
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
            instrument_desktop::commands::crypto::nanoid_process,
            instrument_desktop::commands::crypto::aes_process,
            instrument_desktop::commands::text::case_process,
            instrument_desktop::commands::text::word_counter_process,
            instrument_desktop::commands::text::string_escaper_process,
            instrument_desktop::commands::text::find_replace_process,
            instrument_desktop::commands::text::lorem_ipsum_process,
            instrument_desktop::commands::text::text_diff_process,
            instrument_desktop::commands::datetime::timestamp_process,
            instrument_desktop::commands::datetime::timezone_process,
            instrument_desktop::commands::datetime::iso8601_process,
            instrument_desktop::commands::datetime::cron_process,
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
        .setup(|_| {
            log::info!("Instrument v{} started", env!("CARGO_PKG_VERSION"));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
