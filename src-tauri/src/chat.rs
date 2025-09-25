use crate::db::Database;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
}

// Lightweight local title generator to avoid network/LLM dependency
fn generate_local_title(messages: &[FrontendMessage]) -> String {
    // Prefer first user message; fallback to first assistant
    let base = messages
        .iter()
        .find(|m| m.role == "user")
        .or_else(|| messages.get(0))
        .map(|m| m.content.trim())
        .unwrap_or("Untitled Chat");

    // Take up to 6 words, strip punctuation, cap length ~50 chars
    let words: Vec<&str> = base.split_whitespace().take(6).collect();
    let mut title = words.join(" ");
    title = title.trim_matches('"').trim_matches('.').to_string();
    if title.is_empty() {
        title = "Untitled Chat".to_string();
    }
    if title.len() > 50 {
        title.truncate(47);
        title.push_str("...");
    }
    title
}

#[tauri::command]
pub async fn insert_message(
    app_handle: tauri::AppHandle,
    id: String,
    session_id: String,
    message: String,
    response: String,
) -> Result<(), String> {
    let db = app_handle.state::<Database>();

    // Insert the message first
    db.insert_message(&id, &session_id, &message, &response)?;

    // If this is the first message in the session, generate title using LLM
    let history = db.get_chat_history(&session_id)?;
    if history.len() == 1 {
        // This is the first message
        let messages = vec![
            FrontendMessage {
                role: "user".to_string(),
                content: message.clone(),
            },
            FrontendMessage {
                role: "assistant".to_string(),
                content: response.clone(),
            },
        ];

        // Generate and save a local title (no network)
        let title = generate_local_title(&messages);
        db.update_session_title(&session_id, &title)?;
    }

    Ok(())
}

#[tauri::command]
pub fn update_message_response(
    app_handle: tauri::AppHandle,
    id: String,
    response: String,
) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.update_message_response(&id, &response)
}

#[tauri::command]
pub fn get_chat_history(
    app_handle: tauri::AppHandle,
    session_id: String,
) -> Result<Vec<FrontendMessage>, String> {
    let db = app_handle.state::<Database>();
    let history = db.get_chat_history(&session_id)?;

    let frontend_history = history
        .into_iter()
        .flat_map(|db_msg| {
            let user_message = FrontendMessage {
                role: "user".to_string(),
                content: db_msg.message,
            };
            if !db_msg.response.is_empty() {
                vec![
                    user_message,
                    FrontendMessage {
                        role: "assistant".to_string(),
                        content: db_msg.response,
                    },
                ]
            } else {
                vec![user_message]
            }
        })
        .collect();

    Ok(frontend_history)
}

#[tauri::command]
pub fn update_session_title(
    app_handle: tauri::AppHandle,
    session_id: String,
    title: String,
) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.update_session_title(&session_id, &title)
}

#[tauri::command]
pub fn get_sessions(app_handle: tauri::AppHandle) -> Result<Vec<ChatSession>, String> {
    let db = app_handle.state::<Database>();
    let sessions = db.get_session_info()?;
    Ok(sessions
        .into_iter()
        .map(|(id, title)| ChatSession { id, title })
        .collect())
}
