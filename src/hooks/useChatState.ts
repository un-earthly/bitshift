import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { llmService } from '../services/llm';
import { modelManager } from '../services/modelManager';

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  size: string;
  url: string;
  contextSize: number;
  downloaded: boolean;
}

interface Message {
  role: string;
  content: string;
  thought?: string;
  showThought?: boolean;
}

interface LlamaConfig {
  model: string;
  use_mlock: boolean;
  n_ctx: number;
  n_gpu_layers: number;
}

interface CompletionParams {
  messages: Message[];
  n_predict: number;
  stop: string[];
}

interface CompletionCallback {
  token: string;
}

interface CompletionResult {
  timings: {
    predicted_per_second: number;
  };
}

interface HuggingFaceFile {
  rfilename: string;
}

interface HuggingFaceResponse {
  siblings: HuggingFaceFile[];
}

export const useLlamaChat = () => {
  const INITIAL_CONVERSATION: Message[] = [
    {
      role: "system",
      content: "This is a conversation between user and assistant, a friendly chatbot.",
    },
  ];

  const [context, setContext] = useState<boolean>(false);
  const [conversation, setConversation] = useState<Message[]>(INITIAL_CONVERSATION);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [currentPage, setCurrentPage] = useState("modelSelection");
  const [tokensPerSecond, setTokensPerSecond] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);

  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);

  const fetchAvailableModels = async () => {
    setIsFetching(true);
    try {
      const models = await modelManager.fetchAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      alert('Failed to fetch available models. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const handleModelSelection = (model: ModelInfo) => {
    setSelectedModel(model);
    if (!model.downloaded) {
      const confirmed = window.confirm(`Do you want to download ${model.name}?`);
      console.log("Confirmed",confirmed);
      if (confirmed) {
        handleDownloadAndNavigate(model);
      } else {
        setSelectedModel(null);
      }
    } else {
      // If model is already downloaded, just load it
      loadModel(model.name).catch(error => {
        console.error('Failed to load model:', error);
        alert(`Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setSelectedModel(null);
      });
    }
  };

  const handleDownloadAndNavigate = async (model: ModelInfo) => {
    await handleDownloadModel(model);
    setCurrentPage("conversation");
  };

  const handleBackToModelSelection = () => {
    setContext(false);
    llmService.cleanup();
    setConversation(INITIAL_CONVERSATION);
    setSelectedModel(null);
    setTokensPerSecond([]);
    setCurrentPage("modelSelection");
  };

  const toggleThought = (messageIndex: number) => {
    setConversation((prev) =>
      prev.map((msg, index) =>
        index === messageIndex ? { ...msg, showThought: !msg.showThought } : msg
      )
    );
  };

  const checkDownloadedModels = async () => {
    try {
      const models = await modelManager.updateModelsStatus();
      setDownloadedModels(models.map(model => model.name));
      setAvailableModels(models); // Update available models with download status
    } catch (error) {
      console.error("Error checking downloaded models:", error);
    }
  };

  useEffect(() => {
    checkDownloadedModels();
  }, [currentPage]);

  const handleDownloadModel = async (model: ModelInfo) => {
    setIsDownloading(true);
    setProgress(0);

    try {
      console.log(`Starting download of model ${model.name}`);
      await modelManager.downloadModel(model, (progress) => {
        console.log(`Download progress: ${progress}%`);
        setProgress(progress);
      });
      console.log(`Model ${model.name} downloaded successfully`);
      
      // Update the models list to reflect the new download
      await checkDownloadedModels();
      
      // Try to load the model
      const loaded = await loadModel(model.name);
      if (!loaded) {
        throw new Error('Failed to load model after download');
      }
    } catch (error) {
      console.error('Error in handleDownloadModel:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Download failed: ${errorMessage}`);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  };

  const stopGeneration = async () => {
    try {
      await llmService.cleanup();
      setIsGenerating(false);
      setIsLoading(false);

      setConversation((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.role === "assistant") {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + "\n\n*Generation stopped by user*",
            },
          ];
        }
        return prev;
      });
    } catch (error) {
      console.error("Error stopping completion:", error);
    }
  };

  const loadModel = async (modelName: string): Promise<boolean> => {
    console.log(`Attempting to load model: ${modelName}`);
    try {
      if (context) {
        console.log('Cleaning up existing model...');
        await llmService.cleanup();
        setContext(false);
        setConversation(INITIAL_CONVERSATION);
      }
      
      const modelId = modelName.replace('.gguf', '');
      console.log(`Initializing model with ID: ${modelId}`);
      await llmService.initialize(modelId);
      
      setContext(true);
      console.log('Model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Error Loading Model: ${errorMessage}`);
      setContext(false);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!context) {
      alert("Please load the model first.");
      return;
    }
    if (!userInput.trim()) {
      alert("Please enter a message.");
      return;
    }

    const newConversation = [
      ...conversation,
      { role: "user", content: userInput },
    ];
    setConversation(newConversation);
    setUserInput("");
    setIsLoading(true);
    setIsGenerating(true);
    setAutoScrollEnabled(true);

    try {
      const response = await llmService.chat(newConversation);
      
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response,
        },
      ]);

      // For now, we'll use a mock value for tokens per second
      setTokensPerSecond((prev) => [
        ...prev,
        20.0,
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Error During Inference: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLElement>) => {
    const currentPosition = event.currentTarget.scrollTop;
    const contentHeight = event.currentTarget.scrollHeight;
    const scrollViewHeight = event.currentTarget.clientHeight;

    scrollPositionRef.current = currentPosition;
    contentHeightRef.current = contentHeight;

    const distanceFromBottom = contentHeight - scrollViewHeight - currentPosition;
    setAutoScrollEnabled(distanceFromBottom < 100);
  };

  return {
    // State
    conversation,
    userInput,
    setUserInput,
    isLoading,
    progress,
    isDownloading,
    availableModels,
    selectedModel,
    currentPage,
    tokensPerSecond,
    isGenerating,
    isFetching,
    autoScrollEnabled,
    downloadedModels,
    
    // Functions
    handleModelSelection,
    handleDownloadAndNavigate,
    handleBackToModelSelection,
    toggleThought,
    fetchAvailableModels,
    handleSendMessage,
    stopGeneration,
    loadModel,
    handleScroll,
    downloadModel: handleDownloadModel,
    cancelDownload: () => modelManager.cancelDownload(),
    
    // Refs
    scrollPositionRef,
    contentHeightRef,
  };
};