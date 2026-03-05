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
            instrument_desktop::commands::crypto::md5_process,
            instrument_desktop::commands::crypto::sha256_process,
            instrument_desktop::commands::crypto::sha512_process,
            instrument_desktop::commands::crypto::ulid_process,
            instrument_desktop::commands::crypto::uuid_process,
            instrument_desktop::commands::encoding::base64_process,
            instrument_desktop::commands::encoding::url_encode_process,
            instrument_desktop::commands::encoding::html_entity_process,
            instrument_desktop::commands::encoding::hex_process,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
