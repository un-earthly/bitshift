import { useState, useRef, useEffect } from 'react';
import { modelManager } from '../services/modelManager';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { llmService } from '../services/llmService';

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

  const handleModelSelection = async (model: ModelInfo) => {
    setSelectedModel(model);
    if (!model.downloaded) {
      const confirmed = window.confirm(`Do you want to download ${model.name}?`);
      console.log("Confirmed", confirmed);
      if (confirmed) {
        await handleDownloadModel(model);
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
      setAvailableModels(models); 
    } catch (error) {
      console.error("Error checking downloaded models:", error);
    }
  };



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
      // await llmService.cleanup();
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
        setContext(false);
        setConversation(INITIAL_CONVERSATION);
      }
      const localDataDir = await appLocalDataDir();
      const fullPath = await join(localDataDir, 'models', modelName);
      console.log("modelPath", fullPath);
      if (!fullPath) {
        console.error('Model file not found at path:', fullPath);
        throw new Error(`Model file not found at ${fullPath}`);
      }

      console.log(`Loading model from path: ${fullPath}`);
      await llmService.loadModel(fullPath);

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
      return;
    }

    const userMessage = { role: "user", content: userInput };
    const newConversation = [...conversation, userMessage];

    // Add user message and an empty placeholder for the assistant's response
    setConversation((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setUserInput("");
    setIsLoading(true);
    setIsGenerating(true);

    try {
      await llmService.generate(
        newConversation,
        (token) => {
          setConversation((prev) => {
            const lastMessage = { ...prev[prev.length - 1] };
            lastMessage.content += token;
            return [...prev.slice(0, -1), lastMessage];
          });
        },
        () => {
          setIsLoading(false);
          setIsGenerating(false);
        }
      );
    } catch (error) {
      console.error("Error generating response:", error);
      setConversation((prev) => {
        const lastMessage = { ...prev[prev.length - 1] };
        lastMessage.content = `Sorry, there was an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        return [...prev.slice(0, -1), lastMessage];
      });
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
    isLoading,
    progress,
    isDownloading,
    availableModels,
    selectedModel,
    tokensPerSecond,
    isGenerating,
    isFetching,
    autoScrollEnabled,
    downloadedModels,

    // Functions
    handleModelSelection,
    toggleThought,
    fetchAvailableModels,
    handleSendMessage,
    stopGeneration,
    loadModel,
    handleScroll,
    cancelDownload: () => modelManager.cancelDownload(),
    setUserInput,
    // Refs
    scrollPositionRef,
    contentHeightRef,
  };
};