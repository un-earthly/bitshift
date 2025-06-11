use portable_pty::{native_pty_system, Child, CommandBuilder, PtyPair, PtySize};
use serde::Serialize;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize, Clone)]
pub struct PtyOutput {
    pub data: String,
}

pub struct PtyState {
    pub pty: Mutex<
        Option<(
            PtyPair,
            Box<dyn Child + Send + Sync + 'static>,
            Box<dyn std::io::Read + Send + 'static>,
            Box<dyn std::io::Write + Send + 'static>,
        )>,
    >,
}

#[tauri::command]
pub fn start_pty(app_handle: AppHandle) {
    let pty_system = native_pty_system();
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .expect("Failed to open PTY");

    let shell = if cfg!(target_os = "windows") {
        "cmd.exe"
    } else {
        "bash"
    };

    println!("[start_pty] Launching shell: {}", shell);

    let mut cmd = CommandBuilder::new(shell);
    cmd.cwd(std::env::current_dir().unwrap());

    let child = pty_pair
        .slave
        .spawn_command(cmd)
        .expect("Failed to spawn command");

    println!("[start_pty] Shell spawned successfully.");

    let reader = pty_pair
        .master
        .try_clone_reader()
        .expect("Failed to clone reader");

    let mut reader_for_thread = pty_pair.master.try_clone_reader().expect("clone failed");

    let writer = pty_pair
        .master
        .take_writer()
        .expect("Failed to take writer");
    let master = pty_pair;

    let state = app_handle.state::<PtyState>();
    *state.pty.lock().unwrap() = Some((master, child, Box::new(reader), Box::new(writer)));

    let app_handle_clone = app_handle.clone();
    thread::spawn(move || {
        let mut buffer = [0; 1024];
        let mut previous_output = String::new();

        println!("[reader_thread] Starting PTY reader loop...");
        loop {
            match reader_for_thread.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    let output = String::from_utf8_lossy(&buffer[..n]).to_string();

                    if output != previous_output {
                        println!("[PTY Output] Raw: {:?}", output);

                        app_handle_clone
                            .emit(
                                "pty_output",
                                PtyOutput {
                                    data: output.clone(),
                                },
                            )
                            .expect("Failed to emit event");

                        previous_output = output;
                    }
                }
                Ok(_) => break,
                Err(e) => {
                    println!("PTY read error: {}", e);
                    break;
                }
            }
        }
    });
}

#[tauri::command]
pub fn write_to_pty(data: String, app_handle: AppHandle) {
    let state = app_handle.state::<PtyState>();
    let mut pty_guard = state.pty.lock().unwrap();
    if let Some((_, _, _, ref mut writer)) = *pty_guard {
        writer
            .write_all(data.as_bytes())
            .expect("Failed to write to PTY");
        writer.flush().expect("Failed to flush PTY");
    }
}
