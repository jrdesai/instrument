//! Global hotkey registration and clipboard helper for the popover picker.

use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

pub const POPOVER_HOTKEY: &str = "CommandOrControl+Shift+Space";

/// Enable or disable the global hotkey at runtime (from Settings toggle).
#[tauri::command]
#[specta::specta]
pub fn set_global_hotkey_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    let gs = app.global_shortcut();
    if enabled {
        if !gs.is_registered(POPOVER_HOTKEY) {
            let app_handle = app.clone();
            gs.on_shortcut(POPOVER_HOTKEY, move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = crate::tray::open_popover_window(&app_handle, "");
                }
            })
            .map_err(|e| e.to_string())?;
        }
    } else {
        gs.unregister(POPOVER_HOTKEY).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Read the current clipboard text — used by the popover picker after selecting a tool.
#[tauri::command]
#[specta::specta]
pub fn read_clipboard_text(app: AppHandle) -> Result<String, String> {
    app.clipboard().read_text().map_err(|e| e.to_string())
}
