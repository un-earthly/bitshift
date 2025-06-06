import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useLlamaChat } from '../hooks/useChatState';
import '../styles/Chat.css';

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="progress-bar-container">
    <div 
      className="progress-bar-fill" 
      style={{ width: `${progress}%` }}
    />
  </div>
);

const LlamaChat = () => {
  const {
    conversation,
    userInput,
    setUserInput,
    isLoading,
    progress,
    isDownloading,
    availableModels,
    selectedModel,
    isGenerating,
    autoScrollEnabled,
    handleModelSelection,
    handleSendMessage,
    stopGeneration,
    handleScroll,
    cancelDownload,
  } = useLlamaChat();

  const scrollViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScrollEnabled && scrollViewRef.current) {
      const element = scrollViewRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [conversation, autoScrollEnabled]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  const handleModelChange = async (modelName: string) => {
    const model = availableModels.find(m => m.name === modelName);
    if (!model) return;

    if (model.downloaded) {
      handleModelSelection(model);
    } else {
      console.log(`Model ${model.name} is not downloaded. Size: ${model.size}`);
      const confirmed = window.confirm(
        `Do you want to download ${model.name}? Size: ${model.size}`
      );
      if (confirmed) {
        console.log(`Starting download of ${model.name} from ${model.url}`);
        try {
          console.log(`Successfully downloaded ${model.name}`);
          handleModelSelection(model);
        } catch (error) {
          console.error(`Failed to download ${model.name}:`, error);
          return;
        }
      } else {
        console.log(`Download cancelled for ${model.name}`);
        return;
      }
    }
  };

  const handleDetach = () => {
    const webview = new WebviewWindow('chat', {
      url: 'chat.html',
      title: 'Chat',
      width: 600,
      height: 800,
    });

    webview.once('tauri://created', () => {
      console.log('Chat window created');
    });

    webview.once('tauri://error', (e) => {
      console.error('Failed to create chat window:', e);
    });
  };

  return (
    <div className="container">
      <div className="chat-header">
        <h1 className="title">Llama Chat</h1>
        <button onClick={handleDetach} className="detach-button">
          Detach
        </button>
        <div className="model-selector">
          <select 
            value={selectedModel?.name || ''} 
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={isDownloading || isGenerating}
          >
            <option value="">Select a model</option>
            {availableModels.map((model) => (
              <option 
                key={model.name} 
                value={model.name}
              >
                {model.name} {model.downloaded ? '(Downloaded)' : `(${model.size})`}
              </option>
            ))}
          </select>
          {isDownloading && (
            <div className="download-status">
              <ProgressBar progress={progress} />
              <div className="download-text">
                Downloading: {progress}%
                <button 
                  onClick={cancelDownload}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chat-body">
        <div 
          className="messages-container" 
          ref={scrollViewRef}
          onScroll={handleScroll}
        >
          {conversation.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ))}
        </div>

        <div className="input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!selectedModel || isLoading}
          />
          {isGenerating ? (
            <button
              className="stop-button"
              onClick={stopGeneration}
            >
              Stop
            </button>
          ) : (
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={!selectedModel || isLoading}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LlamaChat;