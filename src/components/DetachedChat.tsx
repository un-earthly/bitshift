import React, { useState } from 'react';
import '../styles/ChatSidebar.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DetachedChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    setMessages([...messages, newMessage]);
    setInput('');
    
    // TODO: Implement actual chat functionality
    setTimeout(() => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: 'This is a mock response. Implement actual chat functionality here.'
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="chat-sidebar detached-window">
      <div className="chat-header">
        <h3>Chat</h3>
      </div>
      
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default DetachedChat; 