use serde::{Deserialize, Serialize};
use std::time::SystemTime;
use std::{fs, path::PathBuf};
use tauri::Manager;
use tauri_plugin_fs::FsExt;
mod db;
use db::Database;
mod file_ops;
use file_ops::{copy, create_dir, index_workspace, move_item, remove, rename};
mod terminal;
use std::collections::HashMap;
use std::sync::Mutex;
pub use terminal::{close_pty, resize_pty, start_pty, write_to_pty, PtyState};

#[derive(Debug, Serialize, Deserialize)]
struct FrontendMessage {
    role: String,
    content: String,
}

#[tauri::command]
fn insert_message(
    app_handle: tauri::AppHandle,
    id: String,
    session_id: String,
    message: String,
    response: String,
) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.insert_message(&id, &session_id, &message, &response)
}

#[tauri::command]
fn update_message_response(
    app_handle: tauri::AppHandle,
    id: String,
    response: String,
) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.update_message_response(&id, &response)
}

#[tauri::command]
fn get_chat_history(
    app_handle: tauri::AppHandle,
    session_id: String,
) -> Result<Vec<FrontendMessage>, String> {
    let db = app_handle.state::<Database>();
    let history = db.get_chat_history(&session_id)?;

    let frontend_history = history
        .into_iter()
        .flat_map(|db_msg| {
            let user_message = FrontendMessage {
                role: "user".to_string(),
                content: db_msg.message,
            };
            if !db_msg.response.is_empty() {
                vec![
                    user_message,
                    FrontendMessage {
                        role: "assistant".to_string(),
                        content: db_msg.response,
                    },
                ]
            } else {
                vec![user_message]
            }
        })
        .collect();

    Ok(frontend_history)
}

#[tauri::command]
fn get_sessions(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let db = app_handle.state::<Database>();
    db.get_sessions()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FileMetadata>>,
}

impl FileMetadata {
    fn new(path: PathBuf) -> std::io::Result<Self> {
        match fs::symlink_metadata(&path) {
            Ok(metadata) => {
                let modified = metadata
                    .modified()
                    .unwrap_or(SystemTime::UNIX_EPOCH)
                    .duration_since(SystemTime::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();

                // println!("Path: {}, is_dir: {}", path.display(), metadata.is_dir());

                Ok(FileMetadata {
                    name: path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .into(),
                    path: path.to_string_lossy().into(),
                    is_dir: metadata.is_dir(),
                    size: metadata.len(),
                    modified,
                    children: None,
                })
            }
            Err(e) => Err(e),
        }
    }
}

#[tauri::command]
async fn read_dir_metadata(path: String, depth: Option<u32>) -> Result<Vec<FileMetadata>, String> {
    let depth = depth.unwrap_or(1);
    read_dir_recursive(PathBuf::from(path), depth).map_err(|e| e.to_string())
}

fn read_dir_recursive(path: PathBuf, depth: u32) -> std::io::Result<Vec<FileMetadata>> {
    let metadata = fs::symlink_metadata(&path)?;
    if !metadata.is_dir() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();
    if depth == 0 {
        return Ok(entries);
    }

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let path = entry.path();
        let mut metadata = FileMetadata::new(path.clone())?;

        if metadata.is_dir && depth > 1 {
            metadata.children = Some(read_dir_recursive(path, depth - 1)?);
        }

        entries.push(metadata);
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });

    Ok(entries)
}

#[tauri::command]
async fn read_file_metadata(path: String) -> Result<FileMetadata, String> {
    FileMetadata::new(PathBuf::from(path)).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle();
            let db = db::Database::init(&handle).expect("Failed to initialize database");
            app.manage(db);

            // Initialize terminal state
            app.manage(PtyState {
                ptys: Mutex::new(HashMap::new()),
            });

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            let models_dir = app_data_dir.join("models");

            // Create models directory if it doesn't exist
            if !models_dir.exists() {
                std::fs::create_dir_all(&models_dir).expect("Failed to create models directory");
            }

            let fs_scope = app.fs_scope();

            // Allow access to models directory
            fs_scope
                .allow_directory(&models_dir, true)
                .expect("Failed to allow models directory access");

            // Allow access to source directory in development
            #[cfg(debug_assertions)]
            {
                let current_dir = std::env::current_dir().expect("Failed to get current directory");
                fs_scope
                    .allow_directory(&current_dir, true)
                    .expect("Failed to allow source directory access");
            }

            // Allow full filesystem access
            {
                let fs_scope = app.fs_scope();

                #[cfg(unix)]
                {
                    fs_scope
                        .allow_directory("/", true)
                        .expect("Failed to allow root directory access");
                }

                #[cfg(windows)]
                {
                    // Allow all Windows drives
                    for drive in 'A'..='Z' {
                        let drive_path = format!("{}:\\", drive);
                        if std::path::Path::new(&drive_path).exists() {
                            fs_scope
                                .allow_directory(&drive_path, true)
                                .expect(&format!("Failed to allow access to drive {}", drive));
                        }
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_dir_metadata,
            read_file_metadata,
            insert_message,
            get_chat_history,
            get_sessions,
            update_message_response,
            rename,
            remove,
            create_dir,
            copy,
            move_item,
            index_workspace,
            start_pty,
            write_to_pty,
            close_pty,
            resize_pty,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
