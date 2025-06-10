// use portable_pty::{native_pty_system, CommandBuilder, PtySize};
// use std::io::{Read, Write};
// use std::sync::{Arc, Mutex};
// use tauri::Emitter;
// use tauri::{AppHandle, Manager, Runtime};
// use tokio::sync::mpsc;
// #[derive(Clone)]
// pub struct Terminal {
//     pty: Arc<Mutex<portable_pty::PtyPair>>,
//     tx: Arc<Mutex<mpsc::Sender<String>>>,
//     writer: Arc<Mutex<Option<Box<dyn Write + Send>>>>,
// }

// impl Terminal {
//     pub fn init(app_handle: &AppHandle) -> Result<Self, String> {
//         let pty_system = native_pty_system();
//         let pty_pair = pty_system
//             .openpty(PtySize::default())
//             .map_err(|e| e.to_string())?;

//         Ok(Terminal {
//             pty: Arc::new(Mutex::new(pty_pair)),
//             tx: Arc::new(Mutex::new(mpsc::channel(100).0)),
//             writer: Arc::new(Mutex::new(None)),
//         })
//     }

//     pub fn start_terminal<R: Runtime>(
//         &self,
//         app: AppHandle<R>,
//         shell: Option<String>,
//     ) -> Result<(), String> {
//         let (shell, args) = get_shell(shell);
//         let mut pty_guard = self.pty.lock().map_err(|e| e.to_string())?;
//         let pty_system = native_pty_system();
//         let pty_pair = pty_system
//             .openpty(PtySize::default())
//             .map_err(|e| e.to_string())?;
//         let mut cmd = CommandBuilder::new(&shell);
//         cmd.args(&args);
//         let _child = pty_pair
//             .slave
//             .spawn_command(cmd)
//             .map_err(|e| e.to_string())?;
//         let reader = pty_pair
//             .master
//             .try_clone_reader()
//             .map_err(|e| e.to_string())?;
//         let writer = pty_pair.master.take_writer();

//         // Update state
//         *pty_guard = pty_pair;
//         *self.writer.lock().map_err(|e| e.to_string())? = Some(writer);
//         let (tx, mut rx) = mpsc::channel(100);
//         *self.tx.lock().map_err(|e| e.to_string())? = tx;

//         // Read terminal output
//         let state = self.clone();
//         tauri::async_runtime::spawn(async move {
//             let mut buffer = [0; 1024];
//             loop {
//                 match reader.read(&mut buffer) {
//                     Ok(n) if n > 0 => {
//                         let output = String::from_utf8_lossy(&buffer[..n]).to_string();
//                         if let Err(e) = state.tx.lock().unwrap().send(output).await {
//                             eprintln!("Failed to send output: {}", e);
//                             break;
//                         }
//                     }
//                     _ => break,
//                 }
//             }
//         });

//         // Forward output to frontend
//         tauri::async_runtime::spawn(async move {
//             while let Some(output) = rx.recv().await {
//                 if let Err(e) = app.emit("terminal-output", &output) {
//                     eprintln!("Failed to emit output: {}", e);
//                 }
//             }
//         });

//         Ok(())
//     }

//     pub fn send_input(&self, input: &str) -> Result<(), String> {
//         let mut writer_guard = self.writer.lock().map_err(|e| e.to_string())?;
//         let writer = writer_guard
//             .as_mut()
//             .ok_or_else(|| "Writer not initialized".to_string())?;
//         writer
//             .write_all(input.as_bytes())
//             .map_err(|e| e.to_string())?;
//         writer.flush().map_err(|e| e.to_string())?;
//         Ok(())
//     }

//     pub fn kill_terminal(&self) -> Result<(), String> {
//         let _pty = self.pty.lock().map_err(|e| e.to_string())?;
//         let _writer = self.writer.lock().map_err(|e| e.to_string())?;
//         Ok(())
//     }

//     pub fn list_shells(&self) -> Result<Vec<String>, String> {
//         let mut shells = vec![];
//         if cfg!(target_os = "windows") {
//             if std::path::Path::new("C:\\Program Files\\Git\\bin\\bash.exe").exists() {
//                 shells.push("Git Bash".to_string());
//             }
//             if std::path::Path::new("C:\\Windows\\System32\\cmd.exe").exists() {
//                 shells.push("cmd.exe".to_string());
//             }
//         } else if cfg!(target_os = "macos") {
//             shells.push("zsh".to_string());
//             shells.push("bash".to_string());
//         } else {
//             shells.push("bash".to_string());
//             shells.push("zsh".to_string());
//         }
//         Ok(shells)
//     }
// }

// // Determine shell based on platform
// fn get_shell(shell_name: Option<String>) -> (String, Vec<String>) {
//     match shell_name.as_deref() {
//         Some("Git Bash") => (
//             "C:\\Program Files\\Git\\bin\\bash.exe".to_string(),
//             vec!["--login".to_string()],
//         ),
//         Some("cmd.exe") => ("cmd.exe".to_string(), vec![]),
//         Some("zsh") => ("/bin/zsh".to_string(), vec!["-l".to_string()]),
//         Some("bash") => ("/bin/bash".to_string(), vec!["--login".to_string()]),
//         _ => {
//             if cfg!(target_os = "windows") {
//                 let git_bash = "C:\\Program Files\\Git\\bin\\bash.exe";
//                 if std::path::Path::new(git_bash).exists() {
//                     (git_bash.to_string(), vec!["--login".to_string()])
//                 } else {
//                     ("cmd.exe".to_string(), vec![])
//                 }
//             } else if cfg!(target_os = "macos") {
//                 ("/bin/zsh".to_string(), vec!["-l".to_string()])
//             } else {
//                 ("/bin/bash".to_string(), vec!["--login".to_string()])
//             }
//         }
//     }
// }

// #[tauri::command]
// pub async fn start_terminal<R: Runtime>(
//     app: AppHandle<R>,
//     state: tauri::State<'_, Terminal>,
//     shell: Option<String>,
// ) -> Result<(), String> {
//     state.start_terminal(app, shell)?;
//     Ok(())
// }

// #[tauri::command]
// pub async fn send_input<R: Runtime>(
//     input: String,
//     state: tauri::State<'_, Terminal>,
// ) -> Result<(), String> {
//     state.send_input(&input)?;
//     Ok(())
// }

// #[tauri::command]
// pub async fn kill_terminal<R: Runtime>(
//     _app: AppHandle<R>,
//     state: tauri::State<'_, Terminal>,
// ) -> Result<(), String> {
//     state.kill_terminal()?;
//     Ok(())
// }

// #[tauri::command]
// pub async fn list_shells<R: Runtime>(
//     state: tauri::State<'_, Terminal>,
// ) -> Result<Vec<String>, String> {
//     state.list_shells()
// }

// pub struct TerminalPlugin<R: Runtime> {
//     invoke_handler: Box<dyn Fn(tauri::ipc::Invoke<R>) + Send + Sync>,
// }

// impl<R: Runtime> Default for TerminalPlugin<R> {
//     fn default() -> Self {
//         Self {
//             invoke_handler: Box::new(|_invoke| {}), // Empty handler since commands are in lib.rs
//         }
//     }
// }

// impl<R: Runtime> tauri::plugin::Plugin<R> for TerminalPlugin<R> {
//     fn name(&self) -> &'static str {
//         "terminal"
//     }

//     fn initialize(&mut self, app: &AppHandle<R>, _config: serde_json::Value) -> tauri::Result<()> {
//         let terminal = Terminal::init(app).map_err(|e| tauri::Error::from(e))?;
//         app.manage(terminal);
//         Ok(())
//     }

//     fn extend_api(&mut self, invoke: tauri::ipc::Invoke<R>) {
//         (self.invoke_handler)(invoke);
//     }
// }

// #![cfg_attr(
//     all(not(debug_assertions), target_os = "windows"),
//     windows_subsystem = "windows"
// )]

// use portable_pty::{native_pty_system, Child, CommandBuilder, PtyPair, PtySize};
// use serde::Serialize;
// use std::io::{Read, Write};
// use std::sync::Mutex;
// use std::thread;
// use tauri::{AppHandle, Emitter, Manager};

// #[derive(Serialize, Clone)]
// struct PtyOutput {
//     data: String,
// }

// struct PtyState {
//     pty: Mutex<
//         Option<(
//             PtyPair,
//             Box<dyn Child + Send + Sync + 'static>,
//             Box<dyn std::io::Read + Send + 'static>,
//             Box<dyn std::io::Write + Send + 'static>,
//         )>,
//     >,
// }

// #[tauri::command]
// pub fn start_pty(app_handle: AppHandle) {
//     let pty_system = native_pty_system();
//     let pty_pair = pty_system
//         .openpty(PtySize {
//             rows: 24,
//             cols: 80,
//             pixel_width: 0,
//             pixel_height: 0,
//         })
//         .expect("Failed to open PTY");

//     let shell = if cfg!(target_os = "windows") {
//         "cmd.exe"
//     } else {
//         "bash"
//     };

//     println!("[start_pty] Launching shell: {}", shell);

//     let mut cmd = CommandBuilder::new(shell);
//     cmd.cwd(std::env::current_dir().unwrap());

//     let child = pty_pair
//         .slave
//         .spawn_command(cmd)
//         .expect("Failed to spawn command");

//     println!("[start_pty] Shell spawned successfully.");

//     let reader = pty_pair
//         .master
//         .try_clone_reader()
//         .expect("Failed to clone reader");

//     let mut reader_for_thread = pty_pair.master.try_clone_reader().expect("clone failed");

//     let writer = pty_pair
//         .master
//         .take_writer()
//         .expect("Failed to take writer");
//     let master = pty_pair;

//     let state = app_handle.state::<PtyState>();
//     *state.pty.lock().unwrap() = Some((master, child, Box::new(reader), Box::new(writer)));

//     let app_handle_clone = app_handle.clone();
//     thread::spawn(move || {
//         let mut buffer = [0; 1024];
//         let mut previous_output = String::new();

//         println!("[reader_thread] Starting PTY reader loop...");
//         loop {
//             match reader_for_thread.read(&mut buffer) {
//                 Ok(n) if n > 0 => {
//                     let output = String::from_utf8_lossy(&buffer[..n]).to_string();

//                     if output != previous_output {
//                         println!("[PTY Output] Raw: {:?}", output);

//                         app_handle_clone
//                             .emit(
//                                 "pty_output",
//                                 PtyOutput {
//                                     data: output.clone(),
//                                 },
//                             )
//                             .expect("Failed to emit event");

//                         previous_output = output;
//                     }
//                 }
//                 Ok(_) => break,
//                 Err(e) => {
//                     println!("PTY read error: {}", e);
//                     break;
//                 }
//             }
//         }
//     });
// }

// #[tauri::command]
// pub fn write_to_pty(data: String, app_handle: AppHandle) {
//     let state = app_handle.state::<PtyState>();
//     let mut pty_guard = state.pty.lock().unwrap();
//     if let Some((_, _, _, ref mut writer)) = *pty_guard {
//         writer
//             .write_all(data.as_bytes())
//             .expect("Failed to write to PTY");
//         writer.flush().expect("Failed to flush PTY");
//     }
// }

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use portable_pty::{native_pty_system, Child, CommandBuilder, PtyPair, PtySize};
use serde::Serialize;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize, Clone)]
struct PtyOutput {
    data: String,
}

#[derive(Default)]
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
pub fn start_pty(app_handle: AppHandle) -> Result<(), String> {
    let pty_system = native_pty_system();

    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

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
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let reader = pty_pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let mut reader_for_thread = pty_pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader for thread: {}", e))?;

    let writer = pty_pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    let state = app_handle.state::<PtyState>();
    *state.pty.lock().map_err(|e| e.to_string())? =
        Some((pty_pair, child, Box::new(reader), Box::new(writer)));

    let app_handle_clone = app_handle.clone();
    thread::spawn(move || {
        let mut buffer = [0; 1024];
        println!("[reader_thread] Starting PTY reader loop...");

        while let Ok(n) = reader_for_thread.read(&mut buffer) {
            if n == 0 {
                break;
            }

            let output = String::from_utf8_lossy(&buffer[..n]).to_string();
            println!("[PTY Output] Raw: {:?}", output);

            if let Err(e) = app_handle_clone.emit(
                "pty_output",
                PtyOutput {
                    data: output.clone(),
                },
            ) {
                println!("Failed to emit PTY output: {}", e);
            }
        }

        println!("[reader_thread] Shell exited or error occurred.");

        let _ = app_handle_clone.emit(
            "pty_exit",
            PtyOutput {
                data: "[Shell exited]".into(),
            },
        );

        // Optionally clear state
        let state = app_handle_clone.state::<PtyState>();
        *state.pty.lock().unwrap() = None;
    });

    Ok(())
}

#[tauri::command]
pub fn write_to_pty(data: String, app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<PtyState>();
    let mut pty_guard = state.pty.lock().map_err(|e| e.to_string())?;

    if let Some((_, _, _, ref mut writer)) = *pty_guard {
        println!("[write_to_pty] Writing: {:?}", data);
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Failed to flush PTY: {}", e))?;
        Ok(())
    } else {
        Err("PTY not initialized. Call start_pty first.".into())
    }
}
