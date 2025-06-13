use crate::config::get_project_directory;
use crate::file_ops::{create_dir, FileOpResult};
use crate::llm::{generate_setup_instructions, SetupInstructions};
use crate::models::{ProjectProgress, ProjectStep};
use crate::scraper::search_web_for_tech_stack;
use std::fs;
use std::path::Path;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

fn run_command(command: &str, args: &[&str], working_dir: Option<&Path>) -> Result<String, String> {
    let mut cmd = Command::new(command);
    cmd.args(args);
    if let Some(dir) = working_dir {
        cmd.current_dir(dir);
    }
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn initialize_project(prompt: String, app_handle: AppHandle) -> Result<(), String> {
    let steps = vec![
        ProjectStep {
            id: "analysis".to_string(),
            title: "Analyzing Project Requirements".to_string(),
            status: "pending".to_string(),
            markdown: None,
        },
        ProjectStep {
            id: "planning".to_string(),
            title: "Planning Project Structure".to_string(),
            status: "pending".to_string(),
            markdown: None,
        },
        ProjectStep {
            id: "setup".to_string(),
            title: "Setting up Project".to_string(),
            status: "pending".to_string(),
            markdown: None,
        },
    ];

    for (i, step) in steps.iter().enumerate() {
        app_handle
            .emit(
                "project_progress",
                &ProjectProgress {
                    step: step.clone(),
                    current_step: i,
                    total_steps: steps.len(),
                },
            )
            .map_err(|e| format!("Failed to emit event: {}", e))?;
    }

    let mut updated_steps = steps.clone();

    // Step 1: Analysis
    updated_steps[0].status = "running".to_string();
    app_handle
        .emit(
            "project_progress",
            &ProjectProgress {
                step: updated_steps[0].clone(),
                current_step: 0,
                total_steps: steps.len(),
            },
        )
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    let SetupInstructions {
        tech_stack,
        commands,
        files,
        primary_language,
    } = generate_setup_instructions(&prompt).await?;
    let markdown = format!(
        "## Project Analysis\n\n**Tech Stack:**\n\n{}",
        tech_stack
            .iter()
            .map(|tech| format!("- {}", tech))
            .collect::<Vec<String>>()
            .join("\n")
    );
    updated_steps[0].status = "completed".to_string();
    updated_steps[0].markdown = Some(markdown.clone());
    app_handle
        .emit(
            "project_progress",
            &ProjectProgress {
                step: updated_steps[0].clone(),
                current_step: 0,
                total_steps: steps.len(),
            },
        )
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    thread::sleep(Duration::from_millis(1500));

    // Step 2: Planning
    updated_steps[1].status = "running".to_string();
    app_handle
        .emit(
            "project_progress",
            &ProjectProgress {
                step: updated_steps[1].clone(),
                current_step: 1,
                total_steps: steps.len(),
            },
        )
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    let refined_stack = search_web_for_tech_stack(&tech_stack, &primary_language).await?;
    let project_structure: String = files
        .keys()
        .map(|path| format!("- {}", path))
        .collect::<Vec<_>>()
        .join("\n");
    let markdown = format!(
        "## Project Structure\n\n**Refined Tech Stack:**\n\n{}\n\n**Files:**\n\n```bash\n{}\n```",
        refined_stack
            .iter()
            .map(|tech| format!("- {}", tech))
            .collect::<Vec<String>>()
            .join("\n"),
        project_structure
    );
    updated_steps[1].status = "completed".to_string();
    updated_steps[1].markdown = Some(markdown.clone());
    app_handle
        .emit(
            "project_progress",
            &ProjectProgress {
                step: updated_steps[1].clone(),
                current_step: 1,
                total_steps: steps.len(),
            },
        )
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    thread::sleep(Duration::from_millis(2000));

    // Step 3: Setup
    updated_steps[2].status = "running".to_string();
    app_handle
        .emit(
            "project_progress",
            &ProjectProgress {
                step: updated_steps[2].clone(),
                current_step: 2,
                total_steps: steps.len(),
            },
        )
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    let project_root = get_project_directory(&app_handle)?;
    let project_dir = project_root.join("project-backend");
    fs::create_dir_all(&project_dir)
        .map_err(|e| format!("Failed to create project directory: {}", e))?;

    let directories: Vec<_> = files
        .keys()
        .map(Path::new)
        .filter_map(|p| p.parent())
        .map(|p| project_dir.join(p))
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    for dir in directories {
        if let FileOpResult {
            success: false,
            message,
        } = create_dir(dir).await
        {
            return Err(format!("Failed to create directory: {}", message));
        }
    }

    for (path, content) in files {
        let full_path = project_dir.join(path);
        fs::create_dir_all(
            full_path
                .parent()
                .ok_or_else(|| "Invalid file path".to_string())?,
        )
        .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        fs::write(&full_path, content)
            .map_err(|e| format!("Failed to write file {}: {}", full_path.display(), e))?;
    }

    for command in commands {
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }
        let cmd = parts[0];
        let args = &parts[1..];
        run_command(cmd, args, Some(&project_dir))
            .map_err(|e| format!("Failed to run command '{}': {}", command, e))?;
    }

    let markdown = format!(
        "## Setup Complete\n\n✅ Project directory created at {}\n✅ Dependencies installed:\n{}\n✅ Files created",
        project_dir.display(),
        refined_stack
            .iter()
            .map(|tech| format!("- {}", tech))
            .collect::<Vec<String>>()
            .join("\n")
    );
    updated_steps[2].status = "completed".to_string();
    updated_steps[2].markdown = Some(markdown.clone());
    app_handle
        .emit(
            "project_progress",
            &ProjectProgress {
                step: updated_steps[2].clone(),
                current_step: 2,
                total_steps: steps.len(),
            },
        )
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    thread::sleep(Duration::from_millis(2500));

    Ok(())
}
