import { useRef, useEffect, useState, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useChatState } from "../hooks/useChatState";
import "../styles/Chat.css";

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="progress-bar-container">
    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
  </div>
);

interface LlamaChatProps {
  showHeader?: boolean;
  onDetach?: () => void;
}

export const LlamaChat: React.FC<LlamaChatProps> = ({
  showHeader = true,
  onDetach,
}) => {
  const {
    conversation,
    userInput,
    isLoading,
    isDownloading,
    progress,
    isGenerating,
    isFetching,
    handleModelSelection,
    handleSendMessage,
    stopGeneration,
    setUserInput,
    selectedModel,
    availableModels,
  } = useChatState();

  const contentRef = useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  useEffect(() => {
    if (autoScrollEnabled && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [conversation, autoScrollEnabled]);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const atBottom = scrollHeight - scrollTop <= clientHeight + 1;
      setAutoScrollEnabled(atBottom);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelName = e.target.value;
    const model = availableModels.find((m) => m.name === modelName);
    if (model) {
      handleModelSelection(model);
    }
  };

  return (
    <div className="chat-container">
      {showHeader && (
        <div className="chat-header">
          <h2>Llama Chat</h2>
          {onDetach && (
            <button onClick={onDetach} className="detach-button">
              Detach
            </button>
          )}
        </div>
      )}

      <div className="model-selector-container">
        <select
          onChange={handleModelChange}
          value={selectedModel?.name || ""}
          disabled={isDownloading || isGenerating}
        >
          <option value="" disabled>
            Select a model
          </option>
          {isFetching ? (
            <option value="loading" disabled>
              Fetching models...
            </option>
          ) : (
            availableModels.map((model) => (
              <option key={model.id} value={model.name}>
                {model.name}{" "}
                {model.downloaded ? "(Downloaded)" : `(${model.size})`}
              </option>
            ))
          )}
        </select>
        {isDownloading && (
          <div className="download-status">
            <ProgressBar progress={progress} />
            <div className="download-text">Downloading: {progress}%</div>
          </div>
        )}
      </div>

      <div className="chat-messages" ref={contentRef} onScroll={handleScroll}>
        {conversation.slice(1).map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isGenerating || !selectedModel}
        />
        {isGenerating ? (
          <button onClick={stopGeneration}>Stop</button>
        ) : (
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || !selectedModel}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
};

export default LlamaChat;