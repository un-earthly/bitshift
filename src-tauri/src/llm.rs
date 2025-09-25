use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
pub struct SetupInstructions {
    pub tech_stack: Vec<String>,
    pub commands: Vec<String>,
    pub files: HashMap<String, String>,
    pub primary_language: String,
}

pub async fn generate_setup_instructions(prompt: &str) -> Result<SetupInstructions, String> {
    println!(
        "[Local] Generating heuristic setup instructions for: {}",
        prompt
    );

    if !prompt
        .chars()
        .all(|c| c.is_alphanumeric() || c.is_whitespace() || ".,!?-_".contains(c))
    {
        return Err("Invalid characters in prompt".to_string());
    }

    // Heuristic mapping based on keywords to keep things offline and light
    let p = prompt.to_lowercase();
    let (tech_stack, commands, files, primary_language) = if p.contains("python")
        || p.contains("django")
        || p.contains("fastapi")
    {
        let ts = vec![
            "Python".to_string(),
            if p.contains("django") {
                "Django"
            } else {
                "FastAPI"
            }
            .to_string(),
        ];
        let cmds = if p.contains("django") {
            vec![
                "python -m venv .venv".to_string(),
                ".venv/bin/pip install django".to_string(),
                "django-admin startproject app .".to_string(),
            ]
        } else {
            vec![
                "python -m venv .venv".to_string(),
                ".venv/bin/pip install fastapi uvicorn".to_string(),
                "echo 'from fastapi import FastAPI\napp = FastAPI()\n@app.get(\"/\")\ndef read_root():\n    return {\"hello\": \"world\"}' > main.py".to_string(),
            ]
        };
        let mut f = HashMap::new();
        f.insert(
            ".gitignore".to_string(),
            ".venv\n__pycache__/\n*.pyc\n".to_string(),
        );
        (ts, cmds, f, "Python".to_string())
    } else if p.contains("node") || p.contains("express") || p.contains("typescript") {
        let ts = vec![
            "Node.js".to_string(),
            if p.contains("typescript") {
                "TypeScript"
            } else {
                "JavaScript"
            }
            .to_string(),
            "Express".to_string(),
        ];
        let cmds = if p.contains("typescript") {
            vec![
                "npm init -y".to_string(),
                "npm i express".to_string(),
                "npm i -D typescript ts-node @types/node @types/express".to_string(),
                "npx tsc --init --rootDir src --outDir dist --esModuleInterop --resolveJsonModule --module commonjs --allowJs false".to_string(),
                "mkdir -p src && printf 'import express from \"express\";\nconst app = express();\napp.get(\"/\",(_,_res)=>_res.json({ ok: true }));\napp.listen(3000);' > src/index.ts".to_string(),
            ]
        } else {
            vec![
                "npm init -y".to_string(),
                "npm i express".to_string(),
                "mkdir -p src && printf 'const express=require(\"express\");\nconst app=express();\napp.get(\"/\",(_req,res)=>res.json({ok:true}));\napp.listen(3000);' > src/index.js".to_string(),
            ]
        };
        let mut f = HashMap::new();
        f.insert(
            ".gitignore".to_string(),
            "node_modules\n.dist\ndist\n".to_string(),
        );
        (
            ts,
            cmds,
            f,
            if p.contains("typescript") {
                "TypeScript"
            } else {
                "JavaScript"
            }
            .to_string(),
        )
    } else if p.contains("rust") || p.contains("actix") {
        let ts = vec!["Rust".to_string(), "Actix Web".to_string()];
        let cmds = vec![
            "cargo init --bin".to_string(),
            "cargo add actix-web".to_string(),
            "printf 'use actix_web::{get, App, HttpServer, Responder};\n#[get(\"/\")] async fn hello()->impl Responder{ \"Hello\" }\n#[actix_web::main] async fn main()->std::io::Result<()> { HttpServer::new(|| App::new().service(hello)).bind((\"127.0.0.1\",8080))?.run().await }' > src/main.rs".to_string(),
        ];
        let files = HashMap::new();
        (ts, cmds, files, "Rust".to_string())
    } else {
        let ts = vec!["Python".to_string()];
        let cmds = vec![
            "python -m venv .venv".to_string(),
            ".venv/bin/pip install flask".to_string(),
            "echo 'from flask import Flask\napp=Flask(__name__)\n@app.get(\"/\")\ndef index():\n    return {\"ok\":True}' > app.py".to_string(),
        ];
        let mut files = HashMap::new();
        files.insert(
            ".gitignore".to_string(),
            ".venv\n__pycache__/\n".to_string(),
        );
        (ts, cmds, files, "Python".to_string())
    };

    Ok(SetupInstructions {
        tech_stack,
        commands,
        files,
        primary_language,
    })
}
