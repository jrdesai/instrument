use serde::Serialize;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Serialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CliStatus {
    pub installed: bool,
    pub install_path: Option<String>,
    pub source_path: Option<String>,
    pub error: Option<String>,
    /// Whether the install directory is currently present in the process PATH.
    pub path_in_env: bool,
}

/// Returns the current CLI installation status.
#[tauri::command]
#[specta::specta]
pub fn cli_status(app: AppHandle) -> Result<CliStatus, String> {
    let source = bundled_cli_path(&app);
    let target = cli_link_path();
    let installed = target
        .as_ref()
        .map(|p| p.exists() || p.symlink_metadata().is_ok())
        .unwrap_or(false);

    Ok(CliStatus {
        installed,
        path_in_env: install_dir_in_path(),
        install_path: target.map(|p| p.to_string_lossy().into_owned()),
        source_path: source.map(|p| p.to_string_lossy().into_owned()),
        error: None,
    })
}

/// Installs the CLI into a user-writable path.
#[tauri::command]
#[specta::specta]
pub fn cli_install(app: AppHandle) -> Result<CliStatus, String> {
    match do_install_impl(&app) {
        Ok(()) => cli_status(app),
        Err(e) => Ok(CliStatus {
            installed: false,
            path_in_env: install_dir_in_path(),
            install_path: cli_link_path().map(|p| p.to_string_lossy().into_owned()),
            source_path: bundled_cli_path(&app).map(|p| p.to_string_lossy().into_owned()),
            error: Some(e.to_string()),
        }),
    }
}

/// Removes the CLI installation.
#[tauri::command]
#[specta::specta]
pub fn cli_uninstall(app: AppHandle) -> Result<CliStatus, String> {
    match do_uninstall_impl() {
        Ok(()) => cli_status(app),
        Err(e) => Ok(CliStatus {
            installed: true,
            path_in_env: install_dir_in_path(),
            install_path: cli_link_path().map(|p| p.to_string_lossy().into_owned()),
            source_path: bundled_cli_path(&app).map(|p| p.to_string_lossy().into_owned()),
            error: Some(e.to_string()),
        }),
    }
}

pub(crate) fn do_install_pub(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    do_install_impl(app)
}

#[cfg(unix)]
fn cli_link_path() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".local/bin/instrument"))
}

#[cfg(unix)]
fn do_install_impl(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let source = bundled_cli_path(app).ok_or("Could not locate bundled CLI binary")?;
    let link = cli_link_path().ok_or("Could not determine install path")?;

    if let Some(parent) = link.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if link.exists() || link.symlink_metadata().is_ok() {
        std::fs::remove_file(&link)?;
    }

    std::os::unix::fs::symlink(&source, &link)?;
    log::info!("CLI installed: {:?} -> {:?}", link, source);
    Ok(())
}

#[cfg(unix)]
fn install_dir_in_path() -> bool {
    let home = std::env::var("HOME").unwrap_or_default();
    // Check shell config files rather than the app process PATH, which is never
    // sourced from ~/.zshrc and will always be the bare macOS system path.
    let candidates = [".zshrc", ".zprofile", ".bashrc", ".bash_profile", ".profile"];
    candidates.iter().any(|f| {
        let path = format!("{home}/{f}");
        std::fs::read_to_string(&path)
            .map(|contents| contents.contains("/.local/bin"))
            .unwrap_or(false)
    })
}

#[cfg(unix)]
fn do_uninstall_impl() -> Result<(), Box<dyn std::error::Error>> {
    if let Some(link) = cli_link_path() {
        if link.exists() || link.symlink_metadata().is_ok() {
            std::fs::remove_file(&link)?;
            log::info!("CLI uninstalled: {:?}", link);
        }
    }
    Ok(())
}

#[cfg(windows)]
fn cli_link_path() -> Option<PathBuf> {
    let local_app_data = std::env::var("LOCALAPPDATA").ok()?;
    Some(
        PathBuf::from(local_app_data)
            .join("instrument")
            .join("bin")
            .join("instrument.exe"),
    )
}

#[cfg(windows)]
fn do_install_impl(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let source = bundled_cli_path(app).ok_or("Could not locate bundled CLI binary")?;
    let dest = cli_link_path().ok_or("Could not determine install path")?;

    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::copy(&source, &dest)?;
    log::info!("CLI installed to {:?}", dest);
    Ok(())
}

#[cfg(windows)]
fn install_dir_in_path() -> bool {
    let Some(dest) = cli_link_path() else { return false };
    let Some(bin_dir) = dest.parent() else { return false };
    let bin_str = bin_dir.to_string_lossy().to_lowercase();
    // Read user PATH from registry — the app process PATH won't reflect manual changes.
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", "[System.Environment]::GetEnvironmentVariable('PATH','User')"])
        .output();
    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout)
            .split(';')
            .any(|e| e.trim().to_lowercase() == bin_str),
        Err(_) => false,
    }
}

#[cfg(windows)]
fn do_uninstall_impl() -> Result<(), Box<dyn std::error::Error>> {
    if let Some(dest) = cli_link_path() {
        if dest.exists() {
            std::fs::remove_file(&dest)?;
        }
    }
    Ok(())
}

fn bundled_cli_path(_app: &AppHandle) -> Option<PathBuf> {
    let ext = if cfg!(windows) { ".exe" } else { "" };
    Some(
        std::env::current_exe()
            .ok()?
            .parent()?
            .join(format!("instrument-cli{ext}")),
    )
}
