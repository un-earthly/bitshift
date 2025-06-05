import React, { useState } from 'react';
import axios from 'axios';
import { join } from '@tauri-apps/api/path';
import { exists, create, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import '../styles/ModelSelector.css';

interface Props {
    onModelSelect: (modelId: string) => void;
    selectedModelId?: string;
}

const modelFormats = [
    { label: 'Llama-3.2-1B-Instruct' },
    { label: 'Qwen2-0.5B-Instruct' },
    { label: 'DeepSeek-R1-Distill-Qwen-1.5B' },
    { label: 'SmolLM2-1.7B-Instruct' },
];

const HF_TO_GGUF = {
    "Llama-3.2-1B-Instruct": "medmekk/Llama-3.2-1B-Instruct.GGUF",
    "DeepSeek-R1-Distill-Qwen-1.5B": "medmekk/DeepSeek-R1-Distill-Qwen-1.5B.GGUF",
    "Qwen2-0.5B-Instruct": "medmekk/Qwen2.5-0.5B-Instruct.GGUF",
    "SmolLM2-1.7B-Instruct": "medmekk/SmolLM2-1.7B-Instruct.GGUF",
};

const downloadModel = async (
    modelName: string,
    modelUrl: string,
    onProgress: (progress: number) => void
) => {
    let destPath: string;
    
    try {
        // Validate inputs
        if (!modelName || !modelUrl) {
            throw new Error('Invalid model name or URL');
        }

        // Get app data directory and create models directory path
        try {
            const appData = await appDataDir();
            const modelsDir = await join(appData, 'models');
            console.log('Models directory path:', modelsDir);
            
            const modelsDirExists = await exists(modelsDir);
            console.log('Models directory exists:', modelsDirExists);
            
            if (!modelsDirExists) {
                await create(modelsDir);
                console.log('Created models directory');
            }
            
            destPath = await join(modelsDir, modelName);
            console.log('Destination path:', destPath);
        } catch (error) {
            console.error('Error setting up directory:', error);
            throw new Error(`Failed to setup directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Download file
        try {
            console.log("Starting download from:", modelUrl);
            const response = await fetch(modelUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            console.log('Total file size:', total, 'bytes');
            
            let loaded = 0;
            const reader = response.body?.getReader();
            
            if (!reader) {
                throw new Error('Failed to get response reader');
            }

            const chunks: Uint8Array[] = [];
            
            // Read the data
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        console.log('Download complete');
                        break;
                    }
                    
                    chunks.push(value);
                    loaded += value.length;
                    console.log(`Downloaded ${loaded} of ${total} bytes`);
                    
                    if (total > 0) {
                        const progress = (loaded / total) * 100;
                        onProgress(Math.floor(progress));
                    }
                }
            } catch (error) {
                console.error('Error reading data:', error);
                throw new Error(`Failed to read data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Combine chunks
            try {
                const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                console.log('Total data length:', totalLength, 'bytes');
                
                const combinedArray = new Uint8Array(totalLength);
                let position = 0;
                
                for (const chunk of chunks) {
                    combinedArray.set(chunk, position);
                    position += chunk.length;
                }
                
                console.log('Combined array length:', combinedArray.length, 'bytes');
                
                // Write file
                try {
                    await writeFile(destPath, combinedArray);
                    console.log('File written successfully to:', destPath);
                    return destPath;
                } catch (error) {
                    console.error('Error writing file:', error);
                    throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Error combining chunks:', error);
                throw new Error(`Failed to combine chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Top level error in downloadModel:', error);
        throw error;
    }
};

const ModelSelector: React.FC<Props> = ({ onModelSelect, selectedModelId }) => {
    const [selectedModelFormat, setSelectedModelFormat] = useState<string>('');
    const [selectedGGUF, setSelectedGGUF] = useState<string | null>(null);
    const [availableGGUFs, setAvailableGGUFs] = useState<string[]>([]);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFormatSelection = async (format: string) => {
        try {
            setSelectedModelFormat(format);
            setAvailableGGUFs([]);
            setError(null);
            await fetchAvailableGGUFs(format);
        } catch (error) {
            console.error('Error in handleFormatSelection:', error);
            setError(`Failed to handle format selection: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    const handleGGUFSelection = async (file: string) => {
        setSelectedGGUF(file);
        if (window.confirm(`Do you want to download ${file}?`)) {
            await handleDownloadModel(file);
        }
        setSelectedGGUF(null);
    };

    const handleDownloadModel = async (file: string) => {
        const downloadUrl = `https://huggingface.co/${
            HF_TO_GGUF[selectedModelFormat as keyof typeof HF_TO_GGUF]
        }/resolve/main/${file}`;
        console.log("Downloading model from:", downloadUrl);
        setIsDownloading(true);
        setProgress(0);
        
        try {
            const destPath = await downloadModel(file, downloadUrl, progress =>
                setProgress(progress)
            );
            
            if (destPath) {
                alert(`Model successfully downloaded to: ${destPath}`);
                console.log('Model downloaded to: ', destPath);
                // Optionally select the model after download
                onModelSelect(file);
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Download failed due to an unknown error.';
            alert(`Error: ${errorMessage}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const fetchAvailableGGUFs = async (modelFormat: string) => {
        if (!modelFormat) {
            alert('Please select a model format first.');
            return;
        }
        
        setIsFetching(true);
        try {
            const repoPath = HF_TO_GGUF[modelFormat as keyof typeof HF_TO_GGUF];
            if (!repoPath) {
                throw new Error(`No repository mapping found for model format: ${modelFormat}`);
            }

            const response = await axios.get(
                `https://huggingface.co/api/models/${repoPath}`
            );

            if (!response.data?.siblings) {
                throw new Error('Invalid API response format');
            }

            const files = response.data.siblings.filter((file: { rfilename: string }) =>
                file.rfilename.endsWith('.gguf')
            );

            setAvailableGGUFs(
                files.map((file: { rfilename: string }) => file.rfilename)
            );
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to fetch .gguf files';
            alert(errorMessage);
            setAvailableGGUFs([]);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="model-selector">
            <div className="model-selector-content">
                <h3>Select Model Format</h3>
                <div className="format-list">
                    {modelFormats.map((format) => (
                        <button
                            key={format.label}
                            onClick={() => handleFormatSelection(format.label)}
                            className={selectedModelFormat === format.label ? 'selected' : ''}
                        >
                            {format.label}
                        </button>
                    ))}
                </div>

                <h3>Available Models</h3>
                <div className="models-list">
                    {isFetching ? (
                        <div>Loading available models...</div>
                    ) : availableGGUFs.length > 0 ? (
                        availableGGUFs.map((model) => (
                            <div
                                key={model}
                                className={`model-card ${selectedGGUF === model ? 'selected' : ''}`}
                                onClick={() => handleGGUFSelection(model)}
                            >
                                {model}
                            </div>
                        ))
                    ) : (
                        <div>No models available. Please select a format first.</div>
                    )}
                </div>

                {isDownloading && (
                    <div className="download-progress">
                        <progress value={progress} max="100" />
                        <span>{progress}%</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelSelector; 