use std::fs;
use std::path::PathBuf;
use tauri::command;

#[derive(Debug, serde::Serialize)]
pub struct FileOpResult {
    success: bool,
    message: String,
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
        FileOpResult { success: true, .. } => {
            match remove(source).await {
                FileOpResult { success: true, .. } => {
                    FileOpResult::success("Successfully moved file/folder")
                }
                FileOpResult { message, .. } => {
                    FileOpResult::error(&format!("Copied but failed to remove source: {}", message))
                }
            }
        }
        FileOpResult { message, .. } => FileOpResult::error(&message),
    }
}

#[command]
pub async fn index_workspace(workspace_path: String) -> FileOpResult {
    // This is just a placeholder - the actual implementation would be in your AI service
    FileOpResult::success("Workspace indexing initiated")
} 