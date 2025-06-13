use serde::{Deserialize, Serialize};
use tauri::Manager;
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendMessage {
    pub role: String,
    pub content: String,
}

#[tauri::command]
pub fn insert_message(
    app_handle: tauri::AppHandle,
    id: String,
    session_id: String,
    message: String,
    response: String,
) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    db.insert_message(&id, &session_id, &message, &response)
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
pub fn get_sessions(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let db = app_handle.state::<Database>();
    db.get_sessions()
}
