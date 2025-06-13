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

// Function to generate a title using the LLM
async fn generate_title_with_llm(messages: &[FrontendMessage]) -> Result<String, String> {
    // Create a prompt for title generation
    let context = messages
        .iter()
        .take(3) // Take first 3 messages for context
        .map(|msg| format!("{}: {}", msg.role, msg.content))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(
        "Based on this conversation, generate a concise and descriptive title (max 6 words):\n\n{}",
        context
    );

    // Use the same LLM service that handles chat to generate the title
    let response = fetch_llm_response(&prompt).await?;

    // Clean up the response
    let title = response
        .trim()
        .trim_matches('"')
        .trim_matches('.')
        .to_string();

    Ok(if title.len() > 50 {
        title[..47].to_string() + "..."
    } else {
        title
    })
}

async fn fetch_llm_response(prompt: &str) -> Result<String, String> {
    // Example using HTTP client to communicate with local llama.cpp server
    let client = reqwest::Client::new();
    let response = client
        .post("http://127.0.0.1:8080/v1/chat/completions")
        .json(&serde_json::json!({
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 20,
            "temperature": 0.7
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    Ok(json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("Untitled Chat")
        .to_string())
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

        // Generate and save the AI-created title
        if let Ok(title) = generate_title_with_llm(&messages).await {
            db.update_session_title(&session_id, &title)?;
        }
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
