import { create } from 'zustand';
import { modelManager } from '../services/modelManager';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { llmService } from '../services/llmService';
import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';

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

interface ChatState {
  context: boolean;
  conversation: Message[];
  userInput: string;
  isLoading: boolean;
  progress: number;
  isDownloading: boolean;
  availableModels: ModelInfo[];
  selectedModel: ModelInfo | null;
  tokensPerSecond: number[];
  isGenerating: boolean;
  isFetching: boolean;
  autoScrollEnabled: boolean;
  downloadedModels: string[];
  currentSessionId: string;

  // Actions
  setContext: (context: boolean) => void;
  setConversation: (conversation: Message[]) => void;
  setUserInput: (userInput: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setProgress: (progress: number) => void;
  setIsDownloading: (isDownloading: boolean) => void;
  setAvailableModels: (models: ModelInfo[]) => void;
  setSelectedModel: (model: ModelInfo | null) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;

  // Async Actions
  fetchAvailableModels: () => Promise<void>;
  loadModel: (modelName: string) => Promise<boolean>;
  handleSendMessage: () => Promise<void>;
  stopGeneration: () => Promise<void>;
  handleModelSelection: (model: ModelInfo) => Promise<void>;

  // New actions
  loadChatHistory: (sessionId: string) => Promise<void>;
  createNewSession: () => void;
  getSessions: () => Promise<Array<{ id: string; title: string }>>;
}

const INITIAL_CONVERSATION: Message[] = [
  {
    role: "system",
    content: "This is a conversation between user and assistant, a friendly chatbot.",
  },
];

const useChatStoreImpl = create<ChatState>((set, get) => ({
  context: false,
  conversation: INITIAL_CONVERSATION,
  userInput: "",
  isLoading: false,
  progress: 0,
  isDownloading: false,
  availableModels: [],
  selectedModel: null,
  tokensPerSecond: [],
  isGenerating: false,
  isFetching: false,
  autoScrollEnabled: true,
  downloadedModels: [],
  currentSessionId: uuidv4(),

  setContext: (context) => set({ context }),
  setConversation: (conversation) => set({ conversation }),
  setUserInput: (userInput) => set({ userInput }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setProgress: (progress) => set({ progress }),
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  setAvailableModels: (models) => set({ availableModels: models }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  addMessage: (message) => set((state) => ({ conversation: [...state.conversation, message] })),
  updateLastMessage: (content) => set(state => {
    const newConversation = [...state.conversation];
    newConversation[newConversation.length - 1].content += content;
    return { conversation: newConversation };
  }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  fetchAvailableModels: async () => {
    set({ isFetching: true });
    try {
      const models = await modelManager.fetchAvailableModels();
      set({ availableModels: models });
    } catch (error) {
      console.error('Failed to fetch available models:', error);
    } finally {
      set({ isFetching: false });
    }
  },

  loadModel: async (modelName: string) => {
    set({ isLoading: true });
    console.log(`Attempting to load model: ${modelName}`);
    try {
      if (get().context) {
        set({ context: false, conversation: INITIAL_CONVERSATION });
      }
      const localDataDir = await appLocalDataDir();
      const fullPath = await join(localDataDir, 'models', modelName);

      await llmService.loadModel(fullPath);

      set({ context: true, isLoading: false });
      console.log('Model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      set({ context: false, isLoading: false });
      return false;
    }
  },

  handleSendMessage: async () => {
    const { context, userInput, conversation, addMessage, setUserInput, setIsLoading, setIsGenerating, updateLastMessage, currentSessionId } = get();

    if (!context) {
      alert("Please load the model first.");
      return;
    }
    if (!userInput.trim()) return;

    const userMessage = { role: "user", content: userInput };
    addMessage(userMessage);
    addMessage({ role: "assistant", content: "" });
    setUserInput("");
    setIsLoading(true);
    setIsGenerating(true);

    const newConversation = [...conversation, userMessage];

    try {
      // Save user message to database and get a unique ID for the exchange
      const messageId = uuidv4();
      await invoke('insert_message', {
        id: messageId,
        sessionId: currentSessionId,
        message: userInput,
        response: ""
      });

      await llmService.generate(
        newConversation,
        async (token) => {
          updateLastMessage(token);
        },
        async () => {
          setIsLoading(false);
          setIsGenerating(false);
          // Update the message row with the assistant's complete response
          const lastMessage = get().conversation[get().conversation.length - 1];
          await invoke('update_message_response', {
            id: messageId,
            response: lastMessage.content
          });
        }
      );
    } catch (error) {
      console.error("Error generating response:", error);
      updateLastMessage(`Sorry, there was an error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsLoading(false);
      setIsGenerating(false);
    }
  },

  stopGeneration: async () => {
    await llmService.stopGeneration();
    set({ isGenerating: false, isLoading: false });
    get().updateLastMessage("\n\n*Generation stopped by user*");
  },

  handleModelSelection: async (model) => {
    set({ selectedModel: model });
    if (!model.downloaded) {
      const confirmed = window.confirm(`Do you want to download ${model.name}?`);
      if (confirmed) {
        set({ isDownloading: true, progress: 0 });
        try {
          await modelManager.downloadModel(model, (p) => set({ progress: p }));
          await get().fetchAvailableModels(); // Refresh models to update status
          await get().loadModel(model.name);
        } catch (error) {
          console.error(`Download failed: ${error}`);
        } finally {
          set({ isDownloading: false });
        }
      }
    } else {
      await get().loadModel(model.name);
    }
  },

  createNewSession: () => {
    set({
      currentSessionId: uuidv4(),
      conversation: INITIAL_CONVERSATION
    });
  },

  loadChatHistory: async (sessionId: string) => {
    try {
      const messages = await invoke<Message[]>('get_chat_history', { sessionId });
      console.log('Loaded chat history:', messages);
      set({
        currentSessionId: sessionId,
        conversation: [...INITIAL_CONVERSATION, ...messages]
      });
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  },

  getSessions: async () => {
    try {
      const sessions = await invoke<Array<{ id: string; title: string }>>('get_sessions');
      return sessions;
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  },
}));


// Export the hook
export const useChatStore = useChatStoreImpl; 