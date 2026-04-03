//! System tray: menu building and Tauri commands (favourites + visibility).

use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

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
        let empty = MenuItem::new(app, "No favourites", false, None::<&str>)?;
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
