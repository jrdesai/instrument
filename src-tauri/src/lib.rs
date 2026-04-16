// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod hotkey;
mod tray;

use specta_typescript::{BigIntExportBehavior, Typescript};
use std::path::Path;
use tauri::tray::TrayIconBuilder;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};
use tauri_specta::{collect_commands, Builder};

/// `tauri-specta` emits imports/helpers at EOF that trip `tsc` `noUnusedLocals` when no events exist.
fn prepend_ts_nocheck_if_needed(path: &Path) {
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!(
                "WARN prepend_ts_nocheck: could not read {}: {} \
                 (tsc may fail with noUnusedLocals errors)",
                path.display(),
                e
            );
            return;
        }
    };
    if content.starts_with("// @ts-nocheck") {
        return;
    }
    let _ = std::fs::write(path, format!("// @ts-nocheck\n{content}"));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)] // export() is debug-only and mutates the builder
    let mut builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        instrument_desktop::commands::auth::tool_jwt_decode,
        instrument_desktop::commands::auth::tool_jwt_build,
        instrument_desktop::commands::auth::tool_basic_auth,
        instrument_desktop::commands::crypto::tool_hash_process,
        instrument_desktop::commands::crypto::tool_ulid_process,
        instrument_desktop::commands::crypto::tool_ulid_inspect,
        instrument_desktop::commands::crypto::tool_uuid_process,
        instrument_desktop::commands::crypto::tool_uuid_inspect,
        instrument_desktop::commands::crypto::tool_api_key_process,
        instrument_desktop::commands::crypto::tool_nanoid_process,
        instrument_desktop::commands::crypto::tool_cert_decode,
        instrument_desktop::commands::crypto::tool_aes_process,
        instrument_desktop::commands::crypto::tool_totp_generate,
        instrument_desktop::commands::crypto::tool_password_process,
        instrument_desktop::commands::crypto::tool_passphrase_process,
        instrument_desktop::commands::text::tool_case_process,
        instrument_desktop::commands::text::tool_word_counter_process,
        instrument_desktop::commands::text::tool_unicode_inspect,
        instrument_desktop::commands::text::tool_slug_generate,
        instrument_desktop::commands::text::tool_string_escaper_process,
        instrument_desktop::commands::text::tool_find_replace_process,
        instrument_desktop::commands::text::tool_lorem_ipsum_process,
        instrument_desktop::commands::text::tool_text_diff_process,
        instrument_desktop::commands::text::tool_line_tools_process,
        instrument_desktop::commands::text::tool_fake_data_process,
        instrument_desktop::commands::text::tool_env_parse,
        instrument_desktop::commands::datetime::tool_timestamp_process,
        instrument_desktop::commands::datetime::tool_timezone_process,
        instrument_desktop::commands::datetime::tool_iso8601_process,
        instrument_desktop::commands::datetime::tool_cron_process,
        instrument_desktop::commands::encoding::tool_base64_process,
        instrument_desktop::commands::encoding::tool_url_encode_process,
        instrument_desktop::commands::encoding::tool_html_entity_process,
        instrument_desktop::commands::encoding::tool_hex_process,
        instrument_desktop::commands::encoding::tool_color_convert,
        instrument_desktop::commands::encoding::tool_qr_generate,
        instrument_desktop::commands::json::tool_json_format,
        instrument_desktop::commands::json::tool_json_validate,
        instrument_desktop::commands::json::tool_json_schema_validate,
        instrument_desktop::commands::json::tool_json_diff,
        instrument_desktop::commands::json::tool_json_path,
        instrument_desktop::commands::json::tool_json_convert,
        instrument_desktop::commands::json::tool_config_convert,
        instrument_desktop::commands::network::tool_url_parse,
        instrument_desktop::commands::network::tool_cidr_calculate,
        instrument_desktop::commands::network::tool_ua_parse,
        instrument_desktop::commands::numbers::tool_base_converter_process,
        instrument_desktop::commands::numbers::tool_bitwise_process,
        instrument_desktop::commands::numbers::tool_chmod_process,
        instrument_desktop::commands::numbers::tool_semver_process,
        instrument_desktop::commands::numbers::tool_unit_convert,
        instrument_desktop::commands::regex::tool_regex_test,
        instrument_desktop::commands::regex::tool_regex_explain,
        instrument_desktop::commands::sql::tool_sql_format,
        instrument_desktop::commands::csv::tool_csv_to_json,
        instrument_desktop::commands::csv::tool_json_to_csv,
        instrument_desktop::commands::xml::tool_xml_format,
        instrument_desktop::commands::html::tool_html_format,
        instrument_desktop::commands::yaml_fmt::tool_yaml_format,
        instrument_desktop::commands::expression::tool_expression_eval,
        instrument_desktop::commands::media::tool_image_convert,
        tray::update_tray_menu,
        tray::set_tray_visible,
        tray::open_popover,
        tray::get_popover_tool,
        tray::open_main_and_navigate,
        tray::consume_popover_clipboard_seed,
        hotkey::set_global_hotkey_enabled,
        hotkey::read_clipboard_text,
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            app.manage(tray::PopoverState {
                tool_id: std::sync::Mutex::new(String::new()),
                clipboard_seed: std::sync::Mutex::new(None),
            });
            log::info!("Instrument v{} started", env!("CARGO_PKG_VERSION"));

            let initial_menu = tray::build_tray_menu(app.handle(), &[])?;
            let Some(icon) = app.default_window_icon().cloned() else {
                log::error!(
                    "Tray skipped: no default window icon configured — check tauri.conf.json"
                );
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
                            let _ = tray::open_popover_window(app, tool_id);
                        }
                    }
                })
                .build(app)?;

            let hotkey_handle = app.handle().clone();
            if let Err(e) = app.handle().global_shortcut().on_shortcut(
                hotkey::POPOVER_HOTKEY,
                move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let _ = tray::open_popover_window(&hotkey_handle, "");
                    }
                },
            ) {
                log::warn!("Failed to register global popover shortcut: {}", e);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
