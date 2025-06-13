import React, { useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useChatState } from '../hooks/useChatState';
import ReactMarkdown from 'react-markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
    <div
      className="h-full bg-primary transition-all duration-500"
      style={{ width: `${progress}%` }}
    />
  </div>
);

interface LlamaChatProps {
  showHeader?: boolean;
  onDetach?: () => void;
  maxMessageLength?: number;
}

export const LlamaChat: React.FC<LlamaChatProps> = ({
  showHeader = true,
  maxMessageLength = 2000,
}) => {
  const {
    conversation,
    userInput,
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
    createNewSession,
    loadChatHistory,
    getSessions,
  } = useChatState();

  const [sessions, setSessions] = React.useState<Array<{ id: string; title: string }>>([]);
  const [error, setError] = React.useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const availableSessions = await getSessions();
    setSessions(availableSessions);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const parent = messagesEndRef.current.parentElement?.parentElement;
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  };

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [conversation]);

  const validateInput = (text: string) => {
    if (!text.trim()) {
      return 'Message cannot be empty';
    }
    if (text.length > maxMessageLength) {
      return `Message is too long (max ${maxMessageLength} characters)`;
    }
    if (!selectedModel) {
      return 'Please select a model first';
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validateInput(userInput);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isGenerating) {
      setError(null);
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setUserInput(newValue);

    if (error) {
      setError(null);
    }

    if (newValue.length > maxMessageLength) {
      setError(`Message is too long (max ${maxMessageLength} characters)`);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {showHeader && (
        <div className="flex-none border-b border-border/40 bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Chat</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  createNewSession();
                  loadSessions();
                }}
              >
                New Chat
              </Button>
            </div>
            <Select
              onValueChange={(sessionId) => loadChatHistory(sessionId)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Load chat history" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950" >
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.title || `Chat ${session.id.slice(0, 8)}...`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-4">
            <Select
              value={selectedModel?.name || ""}
              onValueChange={(value) => {
                const model = availableModels.find(m => m.name === value);
                if (model) {
                  handleModelSelection(model);
                  setError(null);
                }
              }}
              disabled={isDownloading || isGenerating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950">
                {isFetching ? (
                  <SelectItem value="loading" disabled>
                    Fetching models...
                  </SelectItem>
                ) : (
                  availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.name}>
                      {model.name} {model.downloaded ? "(Downloaded)" : `(${model.size})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {isDownloading && (
              <div className="space-y-2">
                <ProgressBar progress={progress} />
                <p className="text-sm text-muted-foreground">
                  Downloading: {progress}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
        <div className="space-y-4 p-4">
          {conversation.length <= 1 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <p>Select a model and start chatting!</p>
            </div>
          ) : (
            conversation.slice(1).map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex w-full",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "flex max-w-[80%] items-start gap-3 rounded-lg px-4 py-2",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div className="min-w-[24px] pt-1">
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>
                        {message.content || '*Empty message*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-none border-t border-border/50 bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={handleInputChange}
              placeholder={selectedModel ? "Type a message..." : "Select a model to start chatting"}
              className={cn(
                "min-h-[60px] max-h-[200px] flex-1 resize-none",
                error && "border-destructive"
              )}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              disabled={isGenerating || isDownloading || !selectedModel}
              maxLength={maxMessageLength}
              aria-invalid={error ? "true" : "false"}
            />
            {isGenerating ? (
              <Button
                type="button"
                variant="destructive"
                onClick={stopGeneration}
                className="self-end"
              >
                Stop
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!userInput.trim() || isGenerating || Boolean(error) || !selectedModel}
                className="self-end"
              >
                Send
              </Button>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {selectedModel ? `Using ${selectedModel.name}` : 'No model selected'}
            </span>
            <span>
              {userInput.length}/{maxMessageLength}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};