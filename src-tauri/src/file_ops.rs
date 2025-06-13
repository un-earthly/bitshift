use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::command;

#[derive(Debug, serde::Serialize)]
pub struct FileOpResult {
    pub success: bool,
    pub message: String,
}

impl FileOpResult {
    fn success(message: &str) -> Self {
        FileOpResult {
            success: true,
            message: message.to_string(),
        }
    }

    fn error(message: &str) -> Self {
        FileOpResult {
            success: false,
            message: message.to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileMetadata>>,
}

impl FileMetadata {
    pub fn new(path: PathBuf) -> std::io::Result<Self> {
        match fs::symlink_metadata(&path) {
            Ok(metadata) => {
                let modified = metadata
                    .modified()
                    .unwrap_or(SystemTime::UNIX_EPOCH)
                    .duration_since(SystemTime::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();

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

#[command]
pub async fn rename(old_path: String, new_path: String) -> FileOpResult {
    match fs::rename(&old_path, &new_path) {
        Ok(_) => FileOpResult::success("Successfully renamed file/folder"),
        Err(e) => FileOpResult::error(&format!("Failed to rename: {}", e)),
    }
}

#[command]
pub async fn remove(path: String) -> FileOpResult {
    let path = PathBuf::from(path);
    let result = if path.is_dir() {
        fs::remove_dir_all(&path)
    } else {
        fs::remove_file(&path)
    };

    match result {
        Ok(_) => FileOpResult::success("Successfully deleted file/folder"),
        Err(e) => FileOpResult::error(&format!("Failed to delete: {}", e)),
    }
}

#[command]
pub async fn create_dir(path: String) -> FileOpResult {
    match fs::create_dir_all(&path) {
        Ok(_) => FileOpResult::success("Successfully created folder"),
        Err(e) => FileOpResult::error(&format!("Failed to create folder: {}", e)),
    }
}

#[command]
pub async fn copy(source: String, destination: String) -> FileOpResult {
    let source_path = PathBuf::from(&source);
    let dest_path = PathBuf::from(&destination);

    let result = if source_path.is_dir() {
        copy_dir_recursive(&source_path, &dest_path)
    } else {
        fs::copy(&source, &destination).map(|_| ())
    };

    match result {
        Ok(_) => FileOpResult::success("Successfully copied file/folder"),
        Err(e) => FileOpResult::error(&format!("Failed to copy: {}", e)),
    }
}

fn copy_dir_recursive(source: &PathBuf, destination: &PathBuf) -> std::io::Result<()> {
    if !destination.exists() {
        fs::create_dir_all(destination)?;
    }

    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let source_path = entry.path();
        let dest_path = destination.join(entry.file_name());

        if file_type.is_dir() {
            copy_dir_recursive(&source_path, &dest_path)?;
        } else {
            fs::copy(&source_path, &dest_path)?;
        }
    }

    Ok(())
}

#[command]
pub async fn move_item(source: String, destination: String) -> FileOpResult {
    // First try to rename (move) directly
    if let Ok(_) = fs::rename(&source, &destination) {
        return FileOpResult::success("Successfully moved file/folder");
    }

    // If rename fails (e.g., across devices), try copy + delete
    match copy(source.clone(), destination).await {
        FileOpResult { success: true, .. } => match remove(source).await {
            FileOpResult { success: true, .. } => {
                FileOpResult::success("Successfully moved file/folder")
            }
            FileOpResult { message, .. } => {
                FileOpResult::error(&format!("Copied but failed to remove source: {}", message))
            }
        },
        FileOpResult { message, .. } => FileOpResult::error(&message),
    }
}

#[command]
pub async fn index_workspace(_workspace_path: String) -> FileOpResult {
    // This is just a placeholder - the actual implementation would be in your AI service
    FileOpResult::success("Workspace indexing initiated")
}

#[tauri::command]
pub async fn read_dir_metadata(
    path: String,
    depth: Option<u32>,
) -> Result<Vec<FileMetadata>, String> {
    let depth = depth.unwrap_or(1);
    read_dir_recursive(PathBuf::from(path), depth).map_err(|e| e.to_string())
}

pub fn read_dir_recursive(path: PathBuf, depth: u32) -> std::io::Result<Vec<FileMetadata>> {
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
pub async fn read_file_metadata(path: String) -> Result<FileMetadata, String> {
    FileMetadata::new(PathBuf::from(path)).map_err(|e| e.to_string())
}
