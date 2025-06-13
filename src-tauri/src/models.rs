use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ProjectStep {
    pub id: String,
    pub title: String,
    pub status: String,
    pub markdown: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ProjectProgress {
    pub step: ProjectStep,
    pub current_step: usize,
    pub total_steps: usize,
}