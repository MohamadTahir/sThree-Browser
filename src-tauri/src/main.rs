// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod store;

use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            list_buckets,
            list_objects,
            add_bucket_config,
            update_bucket_config,
            get_bucket_configs,
            delete_bucket_config,
            set_active_bucket
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
