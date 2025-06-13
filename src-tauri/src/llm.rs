use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct ChatRequest {
    messages: Vec<ChatMessage>,
    max_tokens: u32,
    temperature: f32,
    top_p: f32,
    stream: bool,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: Option<ChatMessage>,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
pub struct SetupInstructions {
    pub tech_stack: Vec<String>,
    pub commands: Vec<String>,
    pub files: HashMap<String, String>,
    pub primary_language: String,
}

pub async fn generate_setup_instructions(prompt: &str) -> Result<SetupInstructions, String> {
    println!("[LLM] Generating setup instructions for prompt: {}", prompt);

    if !prompt.chars().all(|c| c.is_alphanumeric() || c.is_whitespace() || ".,!?-_".contains(c)) {
        return Err("Invalid characters in prompt".to_string());
    }

    let client = Client::new();
    let llm_prompt = format!(
        "Given the prompt '{}', generate setup instructions for a backend project. Return a JSON object with:
        - 'tech_stack': an array of technologies (e.g., [\"Django\", \"PostgreSQL\"]),
        - 'commands': an array of terminal commands to set up the project (e.g., [\"pip install django\", \"django-admin startproject myproject\"]),
        - 'files': an object mapping file paths to their content (e.g., {{ \"myproject/settings.py\": \"...\" }}),
        - 'primary_language': the main programming language (e.g., \"Python\").
        Ensure commands are platform-agnostic where possible and files are minimal but functional.",
        prompt
    );

    let request = ChatRequest {
        messages: vec![ChatMessage {
            role: "user".to_string(),
            content: llm_prompt,
        }],
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
    };

    let response = client
        .post("http://127.0.0.1:8080/v1/chat/completions")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to call llama-cpp server: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("LLM server error: {}", response.status()));
    }

    let chat_response: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse LLM response: {}", e))?;

    let content = chat_response
        .choices
        .get(0)
        .and_then(|choice| choice.message.as_ref().map(|m| m.content.clone()))
        .ok_or_else(|| "No content in LLM response".to_string())?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))
}