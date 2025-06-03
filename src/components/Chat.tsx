import React, { useState, useRef, useEffect } from 'react';
import '../styles/Chat.css';
import { Message } from '../hooks/useChatState';

interface ChatProps {
  messages: Message[];
  onSendMessage: (message: Message) => void;
  isDetached?: boolean;
  onDetach?: () => void;
}

const Chat: React.FC<ChatProps> = ({ 
  messages, 
  onSendMessage, 
  isDetached = false, 
  onDetach 
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    onSendMessage(newMessage);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={isDetached ? "chat-window" : "chat-sidebar"}>
      <div className="chat-header">
        <h3>Chat</h3>
        {!isDetached && onDetach && (
          <button onClick={onDetach}>
            <span>Detach</span>
          </button>
        )}
      </div>
      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="input-container">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          autoFocus
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat; 