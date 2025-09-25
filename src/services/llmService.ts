import { WebLLMProvider } from './llmProviders/webllmProvider';

export interface LLMConfig {
  model_path: string; // For WebLLM, this is the model identifier (e.g., MLC model name)
  context_size: number;
  temperature: number;
  top_p: number;
  max_tokens: number;
}

class LLMService {
  private config: LLMConfig = {
    model_path: '',
    context_size: 2048,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 256,
  };

  private provider: WebLLMProvider | null = null;

  async loadModel(modelId: string): Promise<void> {
    // modelId corresponds to WebLLM model identifier (e.g., "Llama-3.2-1B-Instruct-q4f32_1-MLC")
    this.config.model_path = modelId;
    try {
      if (!this.provider) this.provider = new WebLLMProvider();
      await this.provider.init({
        model: modelId,
        temperature: this.config.temperature,
        top_p: this.config.top_p,
        max_tokens: this.config.max_tokens,
      });
      console.log('WebLLM initialized with model:', modelId);
    } catch (error) {
      console.error('Failed to initialize WebLLM:', error);
      throw error;
    }
  }

  async updateConfig(config: Partial<LLMConfig> = {}): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async generate(
    messages: Array<{ role: string; content: string }>,
    onToken: (token: string) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized. Call loadModel() first.');
      }
      await this.provider.generate(messages, onToken, onComplete);
    } catch (error) {
      console.error('Error generating completion via WebLLM:', error);
      onComplete();
      throw error;
    }
  }

  async stopGeneration(): Promise<void> {
    if (this.provider) {
      await this.provider.stop();
    }
  }
}

export const llmService = new LLMService();