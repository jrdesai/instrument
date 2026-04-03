// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod tray;

use specta_typescript::{BigIntExportBehavior, Typescript};
use std::path::Path;
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};
use tauri_specta::{collect_commands, Builder};

/// `tauri-specta` emits imports/helpers at EOF that trip `tsc` `noUnusedLocals` when no events exist.
fn prepend_ts_nocheck_if_needed(path: &Path) {
    let Ok(content) = std::fs::read_to_string(path) else {
        return;
    };
    if content.starts_with("// @ts-nocheck") {
        return;
    }
    let _ = std::fs::write(
        path,
        format!("// @ts-nocheck\n{content}"),
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)] // export() is debug-only and mutates the builder
    let mut builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        instrument_desktop::commands::auth::tool_jwt_decode,
        instrument_desktop::commands::auth::tool_jwt_build,
        instrument_desktop::commands::crypto::hash_process,
        instrument_desktop::commands::crypto::ulid_process,
        instrument_desktop::commands::crypto::ulid_inspect,
        instrument_desktop::commands::crypto::uuid_process,
        instrument_desktop::commands::crypto::uuid_inspect,
        instrument_desktop::commands::crypto::api_key_process,
        instrument_desktop::commands::crypto::nanoid_process,
        instrument_desktop::commands::crypto::cert_decode,
        instrument_desktop::commands::crypto::aes_process,
        instrument_desktop::commands::crypto::password_process,
        instrument_desktop::commands::crypto::passphrase_process,
        instrument_desktop::commands::text::case_process,
        instrument_desktop::commands::text::word_counter_process,
        instrument_desktop::commands::text::string_escaper_process,
        instrument_desktop::commands::text::find_replace_process,
        instrument_desktop::commands::text::lorem_ipsum_process,
        instrument_desktop::commands::text::text_diff_process,
        instrument_desktop::commands::text::line_tools_process,
        instrument_desktop::commands::text::env_parse,
        instrument_desktop::commands::datetime::timestamp_process,
        instrument_desktop::commands::datetime::timezone_process,
        instrument_desktop::commands::datetime::iso8601_process,
        instrument_desktop::commands::datetime::cron_process,
        instrument_desktop::commands::encoding::base64_process,
        instrument_desktop::commands::encoding::url_encode_process,
        instrument_desktop::commands::encoding::html_entity_process,
        instrument_desktop::commands::encoding::hex_process,
        instrument_desktop::commands::encoding::color_convert,
        instrument_desktop::commands::encoding::qr_generate,
        instrument_desktop::commands::json::tool_json_format,
        instrument_desktop::commands::json::tool_json_validate,
        instrument_desktop::commands::json::tool_json_schema_validate,
        instrument_desktop::commands::json::tool_json_diff,
        instrument_desktop::commands::json::tool_json_path,
        instrument_desktop::commands::json::tool_json_convert,
        instrument_desktop::commands::json::tool_config_convert,
        instrument_desktop::commands::network::tool_url_parse,
        instrument_desktop::commands::network::cidr_calculate,
        instrument_desktop::commands::numbers::base_converter_process,
        instrument_desktop::commands::numbers::bitwise_process,
        instrument_desktop::commands::numbers::chmod_process,
        instrument_desktop::commands::numbers::semver_process,
        instrument_desktop::commands::numbers::unit_convert,
        instrument_desktop::commands::regex::tool_regex_test,
        instrument_desktop::commands::regex::tool_regex_explain,
        instrument_desktop::commands::sql::tool_sql_format,
        instrument_desktop::commands::csv::tool_csv_to_json,
        instrument_desktop::commands::expression::tool_expression_eval,
        tray::update_tray_menu,
        tray::set_tray_visible,
    ]);

    #[cfg(debug_assertions)]
    {
        let tauri_ts = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../src/bindings/tauri.ts");
        builder
            .export(
                // usize/i64/u64 map to TS bigint by default; serde_json uses numbers — match that in bindings.
                Typescript::default().bigint(BigIntExportBehavior::Number),
                &tauri_ts,
            )
            .expect("failed to export tauri TypeScript bindings");
        prepend_ts_nocheck_if_needed(&tauri_ts);
    }

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout).filter(|m| {
                        m.level() <= log::Level::Warn
                            || m.target().starts_with("instrument_desktop")
                    }),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("instrument".into()),
                    })
                    .filter(|m| m.level() <= log::Level::Warn),
                ])
                .rotation_strategy(RotationStrategy::KeepOne)
                .max_file_size(5_000_000)
                .level(log::LevelFilter::Warn)
                .level_for("instrument_desktop", log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            log::info!("Instrument v{} started", env!("CARGO_PKG_VERSION"));

            let initial_menu = tray::build_tray_menu(app.handle(), &[])?;
            let Some(icon) = app.default_window_icon().cloned() else {
                log::warn!("Tray skipped: no default window icon configured");
                return Ok(());
            };
            TrayIconBuilder::with_id("main-tray")
                .icon(icon)
                .menu(&initial_menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "open-instrument" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        tool_id => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            let _ = app.emit("navigate-to-tool", tool_id);
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
