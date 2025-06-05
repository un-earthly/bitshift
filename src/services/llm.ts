import { Command } from '@tauri-apps/plugin-shell';
import { modelManager } from './modelManager';
import { BaseDirectory } from '@tauri-apps/api/path';

interface LLMConfig {
  modelPath: string;
  contextSize?: number;
  threads?: number;
  temperature?: number;
}

class LLMService {
  private serverProcess: any = null;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private currentModelId: string | null = null;

  async initialize(modelId: string) {
    console.log('Starting LLM initialization with model:', modelId);
    if (this.serverProcess) {
      console.log('Existing server process found, cleaning up...');
      await this.cleanup();
    }

    try {
      console.log('Getting model path from modelManager...');
      const modelPath = await modelManager.getModelPath(modelId);
      console.log('Model path resolved to:', modelPath);
      
      // Check if model file exists
      console.log('Checking if model file exists...');
      const exists = await import('@tauri-apps/plugin-fs').then(fs => 
        fs.exists(modelPath, { baseDir: BaseDirectory.AppLocalData })
      );
      console.log('Model file exists?', exists);
      
      if (!exists) {
        console.error('Model file not found at path:', modelPath);
        throw new Error(`Model file not found at ${modelPath}`);
      }
      
      console.log('Starting llama.cpp server with model:', modelPath);
      const command = Command.sidecar('binaries/llama', [
        '--model', modelPath,
        '--ctx-size', '2048',
        '--threads', '4',
        '--port', '8080'
      ]);
      
      command.on('close', data => {
        console.log(`Server process closed with code ${data.code} and signal ${data.signal}`);
        this.isInitialized = false;
      });
      
      command.on('error', error => {
        console.error(`Server process error: "${error}"`);
        this.isInitialized = false;
      });
      
      command.stdout.on('data', line => {
        console.log(`Server stdout: "${line}"`);
      });
      
      command.stderr.on('data', line => {
        console.log(`Server stderr: "${line}"`);
      });

      console.log('Spawning server process...');
      this.serverProcess = await command.spawn();
      console.log('Server process started with PID:', this.serverProcess.pid);
      this.currentModelId = modelId;

      // Wait for server to be ready
      console.log('Waiting for server to be ready...');
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        console.log(`Health check attempt ${attempts + 1}/${maxAttempts}`);
        const isHealthy = await this.checkServerHealth();
        if (isHealthy) {
          this.isInitialized = true;
          console.log('Server is healthy and ready');
          break;
        }
        console.log('Server not ready yet, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!this.isInitialized) {
        throw new Error('Server failed to initialize after multiple attempts');
      }

      // Start health check polling
      console.log('Starting periodic health checks...');
      this.healthCheckInterval = setInterval(async () => {
        this.isInitialized = await this.checkServerHealth();
      }, 2000);

    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      await this.cleanup(); // Clean up if initialization fails
      throw error;
    }
  }

  private async checkServerHealth(): Promise<boolean> {
    try {
      console.log('Checking server health...');
      const response = await fetch('http://127.0.0.1:1420/health');
      const isHealthy = response.status === 200;
      console.log('Server health check:', isHealthy ? 'healthy' : 'unhealthy');
      return isHealthy;
    } catch (error) {
      console.log('Server health check failed:', error);
      return false;
    }
  }

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('LLM server not initialized');
    }

    try {
      // Format the conversation history with token delimiters
      const conversationHistory = messages
        .map(msg => `<start_of_turn>${msg.role}\n${msg.content}<end_of_turn>\n`)
        .join('');
      
      const response = await fetch('http://127.0.0.1:1420/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `<bos>${conversationHistory}<start_of_turn>model\n`,
          n_predict: 512,
        })
      });

      const data = await response.json();
      return data.content || String(data);
    } catch (error) {
      console.error('Error in LLM chat:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.serverProcess) {
      try {
        await this.serverProcess.kill();
      } catch (error) {
        console.error('Error killing server process:', error);
      }
      this.serverProcess = null;
    }
    this.isInitialized = false;
    this.currentModelId = null;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }
}

// Create a singleton instance
export const llmService = new LLMService();

