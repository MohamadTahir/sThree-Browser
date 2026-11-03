// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_dialog::DialogExt;

/// Ask where to save a settings export, then write it. Returns false when the
/// user cancels. The webview can't save blob downloads reliably, and this keeps
/// file-system access to the one path the user picked.
#[tauri::command]
async fn save_export(
    app: tauri::AppHandle,
    file_name: String,
    contents: String,
) -> Result<bool, String> {
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_file_name(&file_name)
            .add_filter("sThree Browser export", &["sthree"])
            .blocking_save_file()
    })
    .await
    .map_err(|e| e.to_string())?;
    let Some(path) = picked else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(path, contents).map_err(|e| e.to_string())?;
    Ok(true)
}

const KEYCHAIN_SERVICE: &str = "com.sthreebrowser";
/// Debug builds use their own item so a dev run never reads or replaces the
/// key of the installed app.
#[cfg(debug_assertions)]
const KEYCHAIN_ACCOUNT: &str = "vault-device-key-dev";
#[cfg(not(debug_assertions))]
const KEYCHAIN_ACCOUNT: &str = "vault-device-key";
const DEVICE_KEY_BYTES: usize = 32;

/// The random device key the vault key is bound to, kept in the OS keychain
/// (macOS Keychain, Windows Credential Manager, Secret Service on Linux).
/// Returns None when there is none yet and `create` is false. With `create`,
/// a missing key is generated and stored first.
#[tauri::command]
async fn vault_device_key(create: bool) -> Result<Option<Vec<u8>>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
            .map_err(|e| e.to_string())?;
        match entry.get_secret() {
            Ok(secret) if secret.len() == DEVICE_KEY_BYTES => Ok(Some(secret)),
            Ok(_) => Err("The vault key in the system keychain is damaged.".into()),
            Err(keyring::Error::NoEntry) if create => {
                let mut secret = vec![0u8; DEVICE_KEY_BYTES];
                getrandom::fill(&mut secret).map_err(|e| e.to_string())?;
                entry.set_secret(&secret).map_err(|e| e.to_string())?;
                Ok(Some(secret))
            }
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    tauri::Builder::default()
        // S3 requests are signed in the webview and sent through this plugin,
        // so they need no CORS policy and never pass through another server.
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_export, vault_device_key])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
