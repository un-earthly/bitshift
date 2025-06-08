use arrow_array::{FixedSizeListArray, Float32Array, RecordBatch};
use lancedb::arrow::arrow_schema::{Field, Schema};
use lancedb::{Connection, Table};
use rust_bert::pipelines::sentence_embeddings::{
    SentenceEmbeddingsBuilder, SentenceEmbeddingsModel, SentenceEmbeddingsModelType,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use walkdir::WalkDir;
use futures::stream::{self, StreamExt};

const EMBEDDING_DIM: i32 = 384; // Dimension for BGE-SMALL-EN-V1.5
const TABLE_NAME: &str = "codebase";

#[derive(Debug, Serialize, Deserialize)]
struct CodeChunk {
    file_path: String,
    content: String,
}

pub struct AiService {
    _db: Connection,
    embedding_model: Arc<SentenceEmbeddingsModel>,
}

impl AiService {
    pub async fn new(db_path: PathBuf) -> anyhow::Result<Self> {
        let db = lancedb::connect(&db_path.to_string_lossy()).execute().await?;
        
        let embedding_model = SentenceEmbeddingsBuilder::remote(SentenceEmbeddingsModelType::BgeSmallEnV15)
            .create_model()?;

        Ok(Self {
            _db: db,
            embedding_model: Arc::new(embedding_model),
        })
    }

    pub async fn index_workspace(&self, workspace_path: PathBuf) -> anyhow::Result<()> {
        let files_to_index = self.collect_files(workspace_path);
        if files_to_index.is_empty() {
            println!("No files to index.");
            return Ok(());
        }
        
        let chunks = self.chunk_files(files_to_index).await;
        if chunks.is_empty() {
            println!("No content to index.");
            return Ok(());
        }

        println!("Found {} chunks to index.", chunks.len());
        self.embed_and_store(chunks).await?;
        Ok(())
    }
    
    fn collect_files(&self, workspace_path: PathBuf) -> Vec<PathBuf> {
        WalkDir::new(workspace_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_file() && self.is_code_file(e.path()))
            .map(|e| e.path().to_path_buf())
            .collect()
    }

    async fn chunk_files(&self, files: Vec<PathBuf>) -> Vec<CodeChunk> {
        stream::iter(files)
            .map(|path| async move {
                if let Ok(content) = tokio::fs::read_to_string(&path).await {
                    // Simple chunking: treat each file as a single chunk for now.
                    Some(CodeChunk {
                        file_path: path.to_string_lossy().to_string(),
                        content,
                    })
                } else {
                    None
                }
            })
            .buffer_unordered(10)
            .filter_map(|x| async { x })
            .collect()
            .await
    }
    
    fn is_code_file(&self, path: &std::path::Path) -> bool {
        const CODE_EXTENSIONS: &[&str] = &["rs", "js", "ts", "tsx", "py", "go", "java", "c", "cpp", "h", "html", "css", "md"];
        path.extension()
            .and_then(|s| s.to_str())
            .map(|s| CODE_EXTENSIONS.contains(&s))
            .unwrap_or(false)
    }

    async fn embed_and_store(&self, chunks: Vec<CodeChunk>) -> anyhow::Result<()> {
        let model = self.embedding_model.clone();
        let contents: Vec<String> = chunks.iter().map(|c| c.content.clone()).collect();
        
        let embeddings = tokio::task::spawn_blocking(move || {
            model.encode(&contents)
        }).await??;

        let embedding_dim = embeddings.get(0).map_or(0, |e| e.len());
        if embedding_dim == 0 {
            return Err(anyhow::anyhow!("Embeddings have zero dimension"));
        }
        
        let schema = Arc::new(Schema::new(vec![
            Field::new("embedding", arrow_array::types::DataType::FixedSizeList(Arc::new(Field::new("item", arrow_array::types::DataType::Float32, true)), embedding_dim as i32), true),
            Field::new("file_path", arrow_array::types::DataType::Utf8, true),
            Field::new("content", arrow_array::types::DataType::Utf8, true),
        ]));

        let db_conn = self._db.clone();
        let _ = db_conn.drop_table(TABLE_NAME).await; // Overwrite for simplicity
        let mut table = db_conn.create_table(TABLE_NAME, schema.clone()).execute().await?;

        let flat_embeddings: Vec<f32> = embeddings.into_iter().flatten().collect();
        let record_batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(FixedSizeListArray::try_new_from_values(Float32Array::from(flat_embeddings), embedding_dim as i32)?),
                Arc::new(arrow_array::StringArray::from(chunks.iter().map(|c| c.file_path.clone()).collect::<Vec<String>>())),
                Arc::new(arrow_array::StringArray::from(chunks.iter().map(|c| c.content.clone()).collect::<Vec<String>>())),
            ],
        )?;

        table.add(Box::new(vec![record_batch])).execute().await?;

        println!("Successfully indexed {} chunks.", chunks.len());
        Ok(())
    }
}
