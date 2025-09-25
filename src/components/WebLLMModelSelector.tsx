import React, { useState } from 'react';
import { llmService } from '../services/llmService';
import '../styles/ModelSelector.css';

interface WebLLMModel {
  id: string; // MLC model identifier
  label: string;
  approxRAM: string;
  notes?: string;
}

interface Props {
  onLoaded?: (modelId: string) => void;
}

// Curated list of lightweight offline-friendly models
const WEBLLM_MODELS: WebLLMModel[] = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 0.5B (Instruct, q4f16_1)',
    approxRAM: '~1.5–2 GB',
    notes: 'Fastest; good for short suggestions and imports.',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    label: 'Llama 3.2 1B (Instruct, q4f32_1)',
    approxRAM: '~2–2.5 GB',
    notes: 'Balanced small model for scaffolding small functions.',
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 1.7B (Instruct, q4f16_1)',
    approxRAM: '~3–3.5 GB',
    notes: 'Better quality, may be slower on low-end GPUs.',
  },
];

const WebLLMModelSelector: React.FC<Props> = ({ onLoaded }) => {
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasWebGPU = typeof navigator !== 'undefined' && (navigator as any).gpu;

  const handleSelect = async (modelId: string) => {
    setError(null);
    setLoadingModel(modelId);
    try {
      await llmService.loadModel(modelId);
      if (onLoaded) onLoaded(modelId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoadingModel(null);
    }
  };

  return (
    <div className="model-selector">
      <div className="model-selector-content">
        <h3>Offline AI Engine (WebGPU)</h3>
        <p>
          Pick a small, offline model. First-time load downloads model artifacts and
          caches them. Performance depends on your GPU/driver and available memory.
        </p>
        {!hasWebGPU && (
          <div style={{ color: 'red', marginBottom: 12 }}>
            WebGPU is not available on this device or browser runtime. Please enable WebGPU or
            use a system with WebGPU support (Chrome/Edge, recent GPUs/drivers). Model loading is disabled.
          </div>
        )}
        {error && (
          <div style={{ color: 'red', marginBottom: 12 }}>
            {error}
          </div>
        )}
        <div className="models-list">
          {WEBLLM_MODELS.map((m) => (
            <div
              key={m.id}
              className={`model-card ${loadingModel === m.id ? 'selected' : ''}`}
              onClick={() => (loadingModel || !hasWebGPU ? undefined : handleSelect(m.id))}
              style={{ opacity: hasWebGPU ? 1 : 0.5, pointerEvents: hasWebGPU ? 'auto' : 'none' }}
            >
              <div style={{ fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>RAM: {m.approxRAM}</div>
              {m.notes && (
                <div style={{ fontSize: 12, opacity: 0.8 }}>{m.notes}</div>
              )}
              {loadingModel === m.id && (
                <div style={{ marginTop: 8, fontSize: 12 }}>Loading model… This may take a moment.</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          Tip: Use Tiny (0.5B) for fastest response while typing. Increase to Small (1–2B) for better quality when generating blocks.
        </div>
      </div>
    </div>
  );
};

export default WebLLMModelSelector;
