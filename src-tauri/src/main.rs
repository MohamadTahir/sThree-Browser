// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod store;

use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_buckets,
            list_objects,
            add_bucket_config,
            update_bucket_config,
            get_bucket_configs,
            delete_bucket_config,
            set_active_bucket,
            get_object_content,
            get_download_dir,
            get_dirname,
            save_file_to_downloads,
            open_folder,
            open_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
