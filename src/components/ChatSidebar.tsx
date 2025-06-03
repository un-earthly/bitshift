import React, { useState } from 'react';
import '../styles/ChatSidebar.css';
import { useChatState, Message } from '../hooks/useChatState';

const ChatSidebar: React.FC = () => {
  const { messages, isDetached, addMessage, handleDetach } = useChatState();
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    addMessage(newMessage);
    setInput('');

    // Mock response
    setTimeout(() => {
      const response: Message = {
        role: 'assistant',
        content: 'This is a mock response. Implement actual chat functionality here.'
      };
      addMessage(response);
    }, 1000);
  };

  if (isDetached) {
    return null;
  }

  return (
    <div className="chat-sidebar">
      <div className="chat-header">
        <h3>Chat</h3>
        <button onClick={handleDetach}>Detach</button>
      </div>
      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatSidebar; 