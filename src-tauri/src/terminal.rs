use portable_pty::{native_pty_system, Child, CommandBuilder, PtyPair, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize, Clone)]
pub struct PtyOutput {
    pub data: String,
    pub id: String,
}

pub struct PtyState {
    pub ptys: Mutex<
        HashMap<
            String,
            (
                PtyPair,
                Box<dyn Child + Send + Sync + 'static>,
                Box<dyn std::io::Read + Send + 'static>,
                Box<dyn std::io::Write + Send + 'static>,
            ),
        >,
    >,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            ptys: Mutex::new(HashMap::new()),
        }
    }
}
#[tauri::command]
pub fn start_pty(id: String, app_handle: AppHandle) -> Result<(), String> {
    println!("[start_pty] Starting PTY setup for ID: {}", id);

    // Check if PTY already exists and clean it up if it does
    let state = app_handle.state::<PtyState>();
    {
        let mut ptys = state.ptys.lock().unwrap();
        if ptys.contains_key(&id) {
            ptys.remove(&id);
            println!("[start_pty] Cleaned up existing PTY session for terminal {}", id);
        }
    }

    let pty_system = native_pty_system();
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| {
            println!("[start_pty] Failed to open PTY: {}", e);
            format!("Failed to open PTY: {}", e)
        })?;

    let shell = if cfg!(target_os = "windows") {
        "cmd.exe"
    } else {
        "bash"
    };

    println!("[start_pty] Launching shell {} for terminal {}", shell, id);

    let mut cmd = CommandBuilder::new(shell);
    cmd.cwd(std::env::current_dir().map_err(|e| {
        println!("[start_pty] Failed to get current dir: {}", e);
        format!("Failed to get current dir: {}", e)
    })?);

    let child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| {
            println!("[start_pty] Failed to spawn command: {}", e);
            format!("Failed to spawn command: {}", e)
        })?;

    println!("[start_pty] Shell spawned successfully for terminal {}", id);

    let reader = pty_pair
        .master
        .try_clone_reader()
        .map_err(|e| {
            println!("[start_pty] Failed to clone reader: {}", e);
            format!("Failed to clone reader: {}", e)
        })?;

    let mut reader_for_thread = pty_pair
        .master
        .try_clone_reader()
        .map_err(|e| {
            println!("[start_pty] Failed to clone reader for thread: {}", e);
            format!("Failed to clone reader for thread: {}", e)
        })?;

    let writer = pty_pair
        .master
        .take_writer()
        .map_err(|e| {
            println!("[start_pty] Failed to take writer: {}", e);
            format!("Failed to take writer: {}", e)
        })?;

    let master = pty_pair;

    // Insert into state
    state.ptys.lock().unwrap().insert(
        id.clone(),
        (master, child, Box::new(reader), Box::new(writer)),
    );
    println!("[start_pty] PTY inserted into state for terminal {}", id);

    // Emit pty_ready event
    app_handle
        .emit("pty_ready", &id)
        .map_err(|e| {
            println!("[start_pty] Failed to emit pty_ready event: {}", e);
            format!("Failed to emit pty_ready event: {}", e)
        })?;

    let app_handle_clone = app_handle.clone();
    let id_clone = id.clone();
    thread::spawn(move || {
        let mut buffer = [0; 1024];
        let mut previous_output = String::new();

        println!("[reader_thread] Starting PTY reader loop for terminal {}", id_clone);
        loop {
            match reader_for_thread.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    let output = String::from_utf8_lossy(&buffer[..n]).to_string();

                    if output != previous_output {
                        println!("[PTY Output] Terminal {}: {:?}", id_clone, output);

                        app_handle_clone
                            .emit(
                                "pty_output",
                                PtyOutput {
                                    data: output.clone(),
                                    id: id_clone.clone(),
                                },
                            )
                            .expect("Failed to emit event");

                        previous_output = output;
                    }
                }
                Ok(_) => {
                    println!("[reader_thread] EOF for terminal {}", id_clone);
                    break;
                }
                Err(e) => {
                    println!("PTY read error for terminal {}: {}", id_clone, e);
                    break;
                }
            }
        }

        // Clean up PTY state when the thread exits
        if let Ok(mut ptys) = app_handle_clone.state::<PtyState>().ptys.lock() {
            if ptys.remove(&id_clone).is_some() {
                println!("[reader_thread] Cleaned up PTY state for terminal {}", id_clone);
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn write_to_pty(id: String, data: String, app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<PtyState>();
    let mut ptys = state.ptys.lock().unwrap();

    if let Some((_, _, _, ref mut writer)) = ptys.get_mut(&id) {
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Failed to flush PTY: {}", e))?;
        Ok(())
    } else {
        Err(format!("No PTY session found for terminal {}", id))
    }
}

#[tauri::command]
pub fn close_pty(id: String, app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<PtyState>();
    let mut ptys = state.ptys.lock().unwrap();

    // Only try to remove if it exists
    match ptys.remove(&id) {
        Some(_) => {
            println!("[close_pty] Closed PTY session for terminal {}", id);
            Ok(())
        }
        None => {
            println!("[close_pty] PTY session not found for terminal {}, might have already been cleaned up", id);
            Ok(())
        }
    }
}

#[tauri::command]
pub fn resize_pty(id: String, rows: u16, cols: u16, app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<PtyState>();
    let ptys = state.ptys.lock().unwrap();

    if let Some((master, _, _, _)) = ptys.get(&id) {
        master
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {}", e))?;
        Ok(())
    } else {
        Err(format!("No PTY session found for terminal {}", id))
    }
}
