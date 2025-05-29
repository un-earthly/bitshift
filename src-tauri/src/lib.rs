// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::{fs, path::PathBuf};
use serde::Serialize;

#[derive(Serialize)]
struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileNode>>,
}


fn read_dir_recursive(path: PathBuf) -> Vec<FileNode> {
    let mut result = Vec::new();
    if let Ok(entries) = fs::read_dir(&path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let is_dir = path.is_dir();
            let children = if is_dir {
                Some(read_dir_recursive(path.clone()))
            } else {
                None
            };
            result.push(FileNode {
                name: path.file_name().unwrap().to_string_lossy().into(),
                path: path.to_string_lossy().into(),
                is_dir,
                children,
            });
        }
    }
    result
}

#[tauri::command]
fn read_folder(path: String) -> Vec<FileNode> {
    read_dir_recursive(PathBuf::from(path))
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_folder, read_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
