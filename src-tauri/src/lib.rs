mod chat;
mod commands;
mod config;
mod db;
mod file_ops;
mod llm;
mod models;
mod scraper;
mod setup;
mod terminal;
use chat::{
    get_chat_history, get_sessions, insert_message, update_message_response, update_session_title,
};
use commands::initialize_project;
use config::{get_project_directory_command, set_project_directory};
use file_ops::{
    copy, create_dir, index_workspace, move_item, read_dir_metadata, read_file_metadata, remove,
    rename,
};
use terminal::{close_pty, resize_pty, start_pty, write_to_pty};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup::setup_app)
        .invoke_handler(tauri::generate_handler![
            // File operations
            read_dir_metadata,
            read_file_metadata,
            rename,
            remove,
            create_dir,
            copy,
            move_item,
            index_workspace,
            // Chat functionality
            insert_message,
            get_chat_history,
            get_sessions,
            update_message_response,
            update_session_title,
            // Terminal operations
            start_pty,
            write_to_pty,
            close_pty,
            resize_pty,
            // Project initialization
            initialize_project,
            // Configuration management
            get_project_directory_command,
            set_project_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
