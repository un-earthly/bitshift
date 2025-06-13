use duckdb::Connection;
use std::fs;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

#[derive(serde::Serialize, Debug)]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub message: String,
    pub response: String,
    pub timestamp: String,
}

pub struct Database {
    duckdb_conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn init(app_handle: &AppHandle) -> Result<Self, String> {
        let app_dir = app_handle.path().app_data_dir().unwrap();
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

        let duckdb_path = app_dir.join("chat_history.duckdb");
        let duckdb_conn = Connection::open(&duckdb_path).map_err(|e| e.to_string())?;
        duckdb_conn
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS messages (
                    id VARCHAR PRIMARY KEY,
                    session_id VARCHAR,
                    message VARCHAR,
                    response VARCHAR,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_session ON messages (session_id);
                
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    session_id VARCHAR PRIMARY KEY,
                    title VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .map_err(|e| e.to_string())?;

        Ok(Database {
            duckdb_conn: Arc::new(Mutex::new(duckdb_conn)),
        })
    }

    pub fn insert_message(
        &self,
        id: &str,
        session_id: &str,
        message: &str,
        response: &str,
    ) -> Result<(), String> {
        let conn = self.duckdb_conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO messages (id, session_id, message, response) VALUES (?, ?, ?, ?)",
            &[id, session_id, message, response],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn update_message_response(&self, id: &str, response: &str) -> Result<(), String> {
        let conn = self.duckdb_conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE messages SET response = ? WHERE id = ?",
            &[response, id],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn get_chat_history(&self, session_id: &str) -> Result<Vec<Message>, String> {
        let conn = self.duckdb_conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, session_id, message, response, CAST(timestamp AS VARCHAR) AS timestamp FROM messages WHERE session_id = ? ORDER BY timestamp")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([session_id], |row| {
                Ok(Message {
                    id: row.get(0)?,         // VARCHAR -> String
                    session_id: row.get(1)?, // VARCHAR -> String
                    message: row.get(2)?,    // VARCHAR -> String
                    response: row.get(3)?,   // VARCHAR -> String
                    timestamp: row.get(4)?,  // Now CAST to VARCHAR -> String
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // Log the entire result
        println!("Chat history for session {}: {:?}", session_id, rows);

        // Log individual messages
        for msg in &rows {
            println!(
                "Message ID: {}, Session: {}, Message: {}, Response: {}, Timestamp: {}",
                msg.id, msg.session_id, msg.message, msg.response, msg.timestamp
            );
        }

        Ok(rows)
    }

    pub fn update_session_title(&self, session_id: &str, title: &str) -> Result<(), String> {
        let conn = self.duckdb_conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO chat_sessions (session_id, title) 
             VALUES (?, ?) 
             ON CONFLICT (session_id) DO UPDATE SET title = EXCLUDED.title",
            &[session_id, title],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn get_session_info(&self) -> Result<Vec<(String, String)>, String> {
        let conn = self.duckdb_conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT session_id, title FROM chat_sessions ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(rows)
    }
}
