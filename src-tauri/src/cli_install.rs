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
    /// True when the shell profile was just updated to add ~/.local/bin to PATH.
    /// The user needs to restart their terminal (or source the profile) for `instrument` to work.
    pub path_updated: bool,
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
        install_path: target.map(|p| p.to_string_lossy().into_owned()),
        source_path: source.map(|p| p.to_string_lossy().into_owned()),
        error: None,
        path_updated: false,
    })
}

/// Installs the CLI into a user-writable path.
#[tauri::command]
#[specta::specta]
pub fn cli_install(app: AppHandle) -> Result<CliStatus, String> {
    match do_install_impl(&app) {
        Ok(path_updated) => {
            let mut status = cli_status(app)?;
            status.path_updated = path_updated;
            Ok(status)
        }
        Err(e) => Ok(CliStatus {
            installed: false,
            path_updated: false,
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
            path_updated: false,
            install_path: cli_link_path().map(|p| p.to_string_lossy().into_owned()),
            source_path: bundled_cli_path(&app).map(|p| p.to_string_lossy().into_owned()),
            error: Some(e.to_string()),
        }),
    }
}

pub(crate) fn do_install_pub(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    do_install_impl(app).map(|_| ())
}

#[cfg(unix)]
fn cli_link_path() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".local/bin/instrument"))
}

#[cfg(unix)]
fn do_install_impl(app: &AppHandle) -> Result<bool, Box<dyn std::error::Error>> {
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

    let path_updated = maybe_add_local_bin_to_path()?;
    Ok(path_updated)
}

/// Appends `export PATH="$HOME/.local/bin:$PATH"` to the user's shell profile when
/// `~/.local/bin` is not already present in the running process's PATH.
/// Returns true if the profile was modified (user must restart terminal / source profile).
#[cfg(unix)]
fn maybe_add_local_bin_to_path() -> Result<bool, Box<dyn std::error::Error>> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set")?;
    let local_bin = format!("{home}/.local/bin");

    let current_path = std::env::var("PATH").unwrap_or_default();
    if current_path.split(':').any(|e| e == local_bin) {
        return Ok(false);
    }

    let shell = std::env::var("SHELL").unwrap_or_default();
    let profile = if shell.ends_with("zsh") {
        format!("{home}/.zshrc")
    } else if shell.ends_with("bash") {
        format!("{home}/.bashrc")
    } else {
        format!("{home}/.profile")
    };

    let existing = std::fs::read_to_string(&profile).unwrap_or_default();
    if existing.contains("/.local/bin") {
        // Already referenced — active after next login even if not in current session.
        return Ok(false);
    }

    use std::io::Write;
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&profile)?;
    writeln!(f, "\nexport PATH=\"$HOME/.local/bin:$PATH\"")?;
    log::info!("Added ~/.local/bin to PATH in {profile}");
    Ok(true)
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
fn do_install_impl(app: &AppHandle) -> Result<bool, Box<dyn std::error::Error>> {
    let source = bundled_cli_path(app).ok_or("Could not locate bundled CLI binary")?;
    let dest = cli_link_path().ok_or("Could not determine install path")?;

    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::copy(&source, &dest)?;

    if let Some(bin_dir) = dest.parent() {
        add_to_user_path_windows(bin_dir.to_str().unwrap_or_default())?;
    }

    log::info!("CLI installed to {:?}", dest);
    // Windows PATH changes take effect in new shells without needing a profile reload.
    Ok(false)
}

#[cfg(windows)]
fn add_to_user_path_windows(dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    use std::process::Command;

    let current = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "[System.Environment]::GetEnvironmentVariable('PATH','User')",
        ])
        .output()?;
    let current_path = String::from_utf8_lossy(&current.stdout).trim().to_string();
    if current_path.split(';').any(|entry| entry.eq_ignore_ascii_case(dir)) {
        return Ok(());
    }

    let escaped_dir = dir.replace('\'', "''");
    let new_path = if current_path.is_empty() {
        escaped_dir
    } else {
        format!("{};{}", current_path.replace('\'', "''"), escaped_dir)
    };
    let script = format!(
        "[System.Environment]::SetEnvironmentVariable('PATH','{}','User')",
        new_path
    );
    Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .output()?;
    Ok(())
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
