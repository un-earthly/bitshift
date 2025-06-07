use std::process::Command;
use tauri::command;

#[command]
pub async fn execute_command(command: String, working_dir: String) -> Result<String, String> {
    let shell = if cfg!(target_os = "windows") { "cmd" } else { "bash" };
    let shell_arg = if cfg!(target_os = "windows") { "/C" } else { "-c" };

    // Add color support for ls command
    let command = if command.starts_with("ls") {
        format!("{} --color=always", command)
    } else {
        command
    };

    let output = Command::new(shell)
        .arg(shell_arg)
        .arg(&command)
        .current_dir(working_dir)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(format!("{}{}", stdout, stderr))
}
