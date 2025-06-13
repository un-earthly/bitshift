use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Read;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize)]
pub struct ProjectConfig {
    pub project_directory: PathBuf,
}

pub fn get_default_project_directory() -> PathBuf {
    if cfg!(target_os = "windows") {
        PathBuf::from("C:\\Projects")
    } else if cfg!(target_os = "macos") {
        dirs::home_dir()
            .unwrap_or_default()
            .join("Documents/Projects")
    } else {
        // Linux and others
        dirs::home_dir().unwrap_or_default().join("Projects")
    }
}

pub fn get_project_directory(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let config_path = app_data_dir.join("project_config.json");

    if config_path.exists() {
        let mut file =
            File::open(&config_path).map_err(|e| format!("Failed to open config: {}", e))?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let config: ProjectConfig = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse config: {}", e))?;
        Ok(config.project_directory)
    } else {
        let default_dir = get_default_project_directory();
        let config = ProjectConfig {
            project_directory: default_dir.clone(),
        };
        fs::create_dir_all(app_data_dir)
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;
        let mut file = File::create(&config_path)
            .map_err(|e| format!("Failed to create config file: {}", e))?;
        serde_json::to_writer(&mut file, &config)
            .map_err(|e| format!("Failed to write config: {}", e))?;
        Ok(default_dir)
    }
}

#[tauri::command]
pub fn set_project_directory(app_handle: AppHandle, directory: String) -> Result<(), String> {
    let dir_path = PathBuf::from(&directory);
    if !dir_path.is_absolute() {
        return Err("Directory must be an absolute path".to_string());
    }

    // Sanitize directory path
    if directory.contains("..") || directory.contains("~") {
        return Err("Invalid directory path".to_string());
    }

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let config_path = app_data_dir.join("project_config.json");

    fs::create_dir_all(&dir_path).map_err(|e| format!("Failed to create directory: {}", e))?;

    let config = ProjectConfig {
        project_directory: dir_path,
    };
    fs::create_dir_all(app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    let mut file =
        File::create(&config_path).map_err(|e| format!("Failed to create config file: {}", e))?;
    serde_json::to_writer(&mut file, &config)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_project_directory_command(app_handle: AppHandle) -> Result<String, String> {
    get_project_directory(&app_handle).map(|p| p.to_string_lossy().to_string())
}
