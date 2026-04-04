//! System tray: menu building, visibility, and popover mini-window.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::webview::WebviewWindowBuilder;
use tauri::{Emitter, Manager, PhysicalPosition, Position, Size, WebviewUrl, WindowEvent};
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Stores the tool ID the popover should show on first load and a one-shot clipboard snapshot.
pub struct PopoverState {
    pub tool_id: Mutex<String>,
    /// Filled when opening from tray; consumed by the popover webview before the tool mounts.
    pub clipboard_seed: Mutex<Option<String>>,
}

/// A single tool entry for the tray menu — id and display name from the frontend.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TrayToolItem {
    pub id: String,
    pub name: String,
}

pub fn build_tray_menu(
    app: &tauri::AppHandle,
    tools: &[TrayToolItem],
) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;
    let header = MenuItem::new(app, "Instrument", false, None::<&str>)?;
    menu.append(&header)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    if tools.is_empty() {
        let empty = MenuItem::new(
            app,
            "No tools — star a popover-eligible tool",
            false,
            None::<&str>,
        )?;
        menu.append(&empty)?;
    } else {
        for tool in tools {
            let item = MenuItem::with_id(app, &tool.id, &tool.name, true, None::<&str>)?;
            menu.append(&item)?;
        }
    }
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    let open = MenuItem::with_id(app, "open-instrument", "Open Instrument", true, None::<&str>)?;
    menu.append(&open)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    menu.append(&quit)?;
    Ok(menu)
}

/// Open or focus the popover webview for a tool (tray click / `open_popover` command).
pub fn open_popover_window(app: &tauri::AppHandle, tool_id: &str) -> tauri::Result<()> {
    if let Some(state) = app.try_state::<PopoverState>() {
        *state.tool_id.lock().unwrap() = tool_id.to_string();
        if tool_id.is_empty() {
            *state.clipboard_seed.lock().unwrap() = None;
        } else {
            let clip = app.clipboard().read_text().ok();
            *state.clipboard_seed.lock().unwrap() = clip;
        }
    }

    let win = if let Some(existing) = app.get_webview_window("popover") {
        existing.show()?;
        existing.set_focus()?;
        if tool_id.is_empty() {
            let _ = existing.emit("popover-show-picker", ());
        } else {
            existing.emit("popover-navigate", tool_id.to_string())?;
        }
        existing
    } else {
        let win = WebviewWindowBuilder::new(app, "popover", WebviewUrl::App("index.html".into()))
            .title("Instrument")
            .inner_size(400.0, 520.0)
            .min_inner_size(400.0, 400.0)
            .resizable(false)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(false)
            .initialization_script("window.__INSTRUMENT_POPOVER__ = true;")
            .build()?;

        if let Some(tray) = app.tray_by_id("main-tray") {
            if let Ok(Some(rect)) = tray.rect() {
                let scale = win.scale_factor().unwrap_or(1.0);
                if let Some(pos) = popover_anchor_below_tray(rect, scale) {
                    let _ = win.set_position(pos);
                }
            }
        }

        let win_clone = win.clone();
        win.on_window_event(move |event| {
            if let WindowEvent::Focused(false) = event {
                let w = win_clone.clone();
                // Tray menu closes before the popover is shown; macOS often delivers a spurious
                // blur. Defer hide so show()+setFocus() (Rust or frontend) can complete first.
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                    if let Ok(false) = w.is_focused() {
                        let _ = w.hide();
                    }
                });
            }
        });
        win
    };

    if !tool_id.is_empty() {
        if let Some(state) = app.try_state::<PopoverState>() {
            if let Some(text) = state.clipboard_seed.lock().unwrap().clone() {
                let _ = win.emit(
                    "popover-clipboard",
                    serde_json::json!({ "toolId": tool_id, "text": text }),
                );
            }
        }
    }

    Ok(())
}

/// Open the popover to a specific tool (e.g. hotkey / programmatic).
#[tauri::command]
#[specta::specta]
pub fn open_popover(app: tauri::AppHandle, tool_id: String) -> Result<(), String> {
    open_popover_window(&app, &tool_id).map_err(|e| e.to_string())
}

/// Initial tool id for the popover webview (set before first open).
#[tauri::command]
#[specta::specta]
pub fn get_popover_tool(state: tauri::State<'_, PopoverState>) -> String {
    state.tool_id.lock().unwrap().clone()
}

/// One-shot clipboard text captured when the tray opened the popover (for auto-paste before mount).
#[tauri::command]
#[specta::specta]
pub fn consume_popover_clipboard_seed(state: tauri::State<'_, PopoverState>) -> Option<String> {
    state.clipboard_seed.lock().unwrap().take()
}

/// Show main window, navigate to tool, hide popover.
#[tauri::command]
#[specta::specta]
pub fn open_main_and_navigate(app: tauri::AppHandle, tool_id: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
    }
    app.emit("navigate-to-tool", tool_id)
        .map_err(|e| e.to_string())?;
    if let Some(popover) = app.get_webview_window("popover") {
        let _ = popover.hide();
    }
    Ok(())
}

/// Called from the frontend whenever the favourites list changes.
#[tauri::command]
#[specta::specta]
pub fn update_tray_menu(app: tauri::AppHandle, tools: Vec<TrayToolItem>) -> Result<(), String> {
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| "Tray not found".to_string())?;
    let menu = build_tray_menu(&app, &tools).map_err(|e| e.to_string())?;
    tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    Ok(())
}

/// Show or hide the tray icon based on user preference.
#[tauri::command]
#[specta::specta]
pub fn set_tray_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| "Tray not found".to_string())?;
    tray.set_visible(visible).map_err(|e| e.to_string())?;
    Ok(())
}

/// Top-left of the popover at the bottom-left of the tray icon (physical pixels).
fn popover_anchor_below_tray(rect: tauri::Rect, scale_factor: f64) -> Option<PhysicalPosition<i32>> {
    match (rect.position, rect.size) {
        (Position::Physical(p), Size::Physical(s)) => Some(PhysicalPosition::new(
            p.x,
            p.y + s.height as i32,
        )),
        (Position::Logical(p), Size::Logical(s)) => {
            let x = (p.x * scale_factor).round() as i32;
            let y = ((p.y + s.height) * scale_factor).round() as i32;
            Some(PhysicalPosition::new(x, y))
        }
        (Position::Physical(p), Size::Logical(s)) => {
            let h = (s.height * scale_factor).round() as i32;
            Some(PhysicalPosition::new(p.x, p.y + h))
        }
        (Position::Logical(p), Size::Physical(s)) => {
            let x = (p.x * scale_factor).round() as i32;
            let y = (p.y * scale_factor).round() as i32 + s.height as i32;
            Some(PhysicalPosition::new(x, y))
        }
    }
}
