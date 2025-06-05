import { BaseDirectory, join } from '@tauri-apps/api/path';
import { create, exists } from '@tauri-apps/plugin-fs';
import axios from 'axios';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  size: string;
  url: string;
  contextSize: number;
  downloaded: boolean;
}

interface HuggingFaceResponse {
  siblings: Array<{
    rfilename: string;
    size?: number;
  }>;
}

class ModelManager {
  private modelsDir = 'models';
  private currentDownloadController: AbortController | null = null;
  private modelRepos: { [key: string]: string } = {
    "Llama-3.2-1B-Instruct": "medmekk/Llama-3.2-1B-Instruct.GGUF",
    "DeepSeek-R1-Distill-Qwen-1.5B": "medmekk/DeepSeek-R1-Distill-Qwen-1.5B.GGUF",
    "Qwen2-0.5B-Instruct": "medmekk/Qwen2.5-0.5B-Instruct.GGUF",
    "SmolLM2-1.7B-Instruct": "medmekk/SmolLM2-1.7B-Instruct.GGUF",
  };

  async initialize() {
    try {
      const modelsDirExists = await exists(this.modelsDir, { 
        baseDir: BaseDirectory.AppLocalData 
      });
      
      if (!modelsDirExists) {
        const file = await create(this.modelsDir, {
          baseDir: BaseDirectory.AppLocalData,
        });
        console.log("Created models directory",JSON.stringify(file));
      }
    } catch (error) {
      console.error('Failed to initialize models directory:', error);
      throw error;
    }
  }

  async addModelRepo(name: string, repoPath: string) {
    this.modelRepos[name] = repoPath;
  }

  async fetchAvailableModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
  
    for (const [modelName, repoPath] of Object.entries(this.modelRepos)) {
      try {
        const response = await axios.get<HuggingFaceResponse>(
          `https://huggingface.co/api/models/${repoPath}`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        );

        console.log("Response",JSON.stringify(response.data,null,2));
        
        const ggufFiles = response.data.siblings.filter(file => 
          file.rfilename.endsWith('.gguf')
        );
        
        for (const file of ggufFiles) {
          const modelInfo: ModelInfo = {
            id: file.rfilename.replace('.gguf', ''),
            name: file.rfilename,
            description: `${modelName} model`,
            size: this.formatFileSize(file.size || 0),
            url: `https://huggingface.co/${repoPath}/resolve/main/${file.rfilename}`,
            contextSize: this.getModelContextSize(modelName),
            downloaded: false
          };
          
          // Check if model is already downloaded
          const modelPath = await join(this.modelsDir, modelInfo.name);
          modelInfo.downloaded = await exists(modelPath, { 
            baseDir: BaseDirectory.AppLocalData 
          });
          
          models.push(modelInfo);
        }
      } catch (error) {
        console.error(`Failed to fetch models for ${modelName}:`, error);
      }
    }
    
    return models;
  }

  async downloadModel(modelInfo: ModelInfo, onProgress: (progress: number) => void): Promise<void> {
    console.log('Starting download process for model:', modelInfo.name);
    const modelPath = await join(this.modelsDir, modelInfo.name);
    console.log('Target download path:', modelPath);
    
    // Check if model is already downloaded
    const fileExists = await exists(modelPath, { baseDir: BaseDirectory.AppLocalData });
    console.log('Model already exists?', fileExists);
    if (fileExists) {
      console.log(`Model ${modelInfo.name} is already downloaded`);
      return;
    }

    // Cancel any existing download
    if (this.currentDownloadController) {
      console.log('Cancelling existing download...');
      this.currentDownloadController.abort();
    }

    this.currentDownloadController = new AbortController();
    console.log('Starting download from URL:', modelInfo.url);
    
    try {
      console.log('Initiating download request...');
      const response = await axios({
        method: 'get',
        url: modelInfo.url,
        responseType: 'arraybuffer',
        signal: this.currentDownloadController.signal,
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 0)
          );
          console.log(`Download progress: ${progressEvent.loaded} / ${progressEvent.total} bytes (${percentCompleted}%)`);
          onProgress(percentCompleted);
        },
      });
      console.log('Download completed, received bytes:', response.data.byteLength);

      console.log('Creating file at:', modelPath);
      const file = await create(modelPath, {
        baseDir: BaseDirectory.AppLocalData,
      });
      console.log('Writing data to file...');
      await file.write(new Uint8Array(response.data));
      await file.close();
      console.log('File successfully written and closed');
      this.currentDownloadController = null;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Download cancelled by user');
        try {
          const fileExists = await exists(modelPath, { baseDir: BaseDirectory.AppLocalData });
          if (fileExists) {
            console.log("Cleaning up partial download file");
          }
        } catch (e) {
          console.error('Error cleaning up partial download:', e);
        }
      } else {
        console.error('Failed to download model:', error);
        throw error;
      }
    }
  }

  cancelDownload() {
    if (this.currentDownloadController) {
      this.currentDownloadController.abort();
      this.currentDownloadController = null;
    }
  }

  async updateModelsStatus(): Promise<ModelInfo[]> {
    const models = await this.fetchAvailableModels();
    for (const model of models) {
      const modelPath = await join(this.modelsDir, model.name);
      model.downloaded = await exists(modelPath, { 
        baseDir: BaseDirectory.AppLocalData 
      });
    }
    return models;
  }

  private getModelContextSize(modelName: string): number {
    const contextSizes: { [key: string]: number } = {
      "Llama-3.2-1B-Instruct": 2048,
      "DeepSeek-R1-Distill-Qwen-1.5B": 4096,
      "Qwen2-0.5B-Instruct": 2048,
      "SmolLM2-1.7B-Instruct": 2048,
    };
    return contextSizes[modelName] || 2048;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  async getModelPath(modelId: string): Promise<string> {
    const modelName = `${modelId}.gguf`;
    return await join(this.modelsDir, modelName);
  }
}

export const modelManager = new ModelManager(); 