// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use std::time::SystemTime;
use tauri_plugin_fs::FsExt;

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
                    name: path.file_name().unwrap_or_default().to_string_lossy().into(),
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

    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
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
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let fs_scope = app.fs_scope();
                fs_scope.allow_directory("/", true).expect("Failed to allow full file system access");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_dir_metadata,
            read_file_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}