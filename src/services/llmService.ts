import { Command } from '@tauri-apps/plugin-shell';

export interface LLMConfig {
  model_path: string;
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

  async loadModel(modelPath: string): Promise<void> {
    this.config.model_path = modelPath;

    try {
      const command = Command.sidecar('runtime/llama-cpp/bin/llama-server', [
        '--model', modelPath,
        '--ctx-size', '2048',
        '--port', '8080',
        '--chat-template', 'llama3'
      ]);
      
      command.on('close', (data: { code: number | null; signal: number | null }) => {
        console.log(`Server finished with code ${data.code} and signal ${data.signal}`);
      });
      
      command.on('error', (error: string) => {
        console.error(`Server error: "${error}"`);
      });
      
      command.stdout.on('data', (line: string) => {
        console.log(`Server stdout: "${line}"`);
      });
      
      command.stderr.on('data', (line: string) => {
        console.log(`Server stderr: "${line}"`);
      });

      const child = await command.spawn();
      console.log('Server started with PID:', child.pid);
    } catch (error) {
      console.error('Failed to start llama server:', error);
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
      const response = await fetch("http://127.0.0.1:8080/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          max_tokens: this.config.max_tokens,
          temperature: this.config.temperature,
          top_p: this.config.top_p,
          stream: true,
        }),
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf('\n\n');
        while(boundary !== -1) {
          const message = buffer.substring(0, boundary);
          buffer = buffer.substring(boundary + 2);

          if (message.startsWith("data: ")) {
            const jsonData = message.substring(5).trim();
            if (jsonData === '[DONE]') {
              onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(jsonData);
              const choice = parsed.choices && parsed.choices[0];
              if (choice) {
                if (choice.delta && choice.delta.content) {
                  onToken(choice.delta.content);
                }
                if (choice.finish_reason) {
                  onComplete();
                  return;
                }
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", jsonData, e);
            }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
      onComplete();
    } catch (error) {
      console.error("Error generating completion:", error);
      onComplete(); // Ensure we always call onComplete
      throw new Error("Failed to generate completion from server.");
    }
  }

  async stopGeneration(): Promise<void> {
    console.log("Stopping generation is not implemented for server mode yet.");
  }
}

export const llmService = new LLMService();