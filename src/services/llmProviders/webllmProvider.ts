import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import * as webllm from "@mlc-ai/web-llm";

export type OnToken = (token: string) => void;
export type OnComplete = () => void;

export interface WebLLMConfig {
  // MLC model identifier, e.g. "Llama-3.2-1B-Instruct-q4f32_1-MLC" or "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"
  model: string;
  // Optional generation params
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

export class WebLLMProvider {
  private engine: webllm.MLCEngineInterface | null = null;
  private config: Required<WebLLMConfig> = {
    model: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 256,
  };

  async init(config?: Partial<WebLLMConfig>) {
    if (!("gpu" in navigator)) {
      throw new Error("WebGPU is not available on this device. Please enable WebGPU or use a smaller model.");
    }

    this.config = { ...this.config, ...(config || {}) };

    // Create a dedicated worker for WebLLM (works with Vite + Tauri)
    const worker = new Worker(
      new URL("@mlc-ai/web-llm/dist/worker.js", import.meta.url),
      { type: "module" }
    );

    this.engine = await webllm.CreateWebWorkerMLCEngine(worker, this.config.model);
  }

  async generate(
    messages: Array<{ role: string; content: string }>,
    onToken: OnToken,
    onComplete: OnComplete
  ) {
    if (!this.engine) {
      throw new Error("WebLLM engine not initialized. Call init() first.");
    }

    // Map to WebLLM message type
    const chatMessages: ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role as any,
      content: m.content,
    }));

    const stream = await this.engine.chat.completions.create({
      messages: chatMessages,
      stream: true,
      temperature: this.config.temperature,
      top_p: this.config.top_p,
      max_tokens: this.config.max_tokens,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) onToken(delta);
      const finish = chunk.choices?.[0]?.finish_reason;
      if (finish) break;
    }
    onComplete();
  }

  async stop() {
    // WebLLM currently does not expose an explicit abort per stream in this wrapper.
    // You can keep an AbortController in generate() to enable cancellation if desired.
  }
}
