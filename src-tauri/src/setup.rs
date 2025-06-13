use crate::{db::Database, terminal::PtyState};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_fs::FsExt;

pub fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    let db = Database::init(&handle).expect("Failed to initialize database");
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
}
