import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWebview } from "@tauri-apps/api/webview";
import './styles/ChatSidebar.css';
import { Message } from './hooks/useChatState';

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const webview = getCurrentWebview();

    // Listen for new messages from the main window
    const unsubscribe = webview.listen<Message>('new-message', (event) => {
      setMessages(prev => [...prev, event.payload]);
    });

    return () => {
      unsubscribe.then(unlisten => unlisten());
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    // TODO: Implement actual chat functionality
    setTimeout(() => {
      const response: Message = {
        role: 'assistant',
        content: 'This is a mock response. Implement actual chat functionality here.'
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>Chat</h3>
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

ReactDOM.createRoot(document.getElementById('chat-root') as HTMLElement).render(
  <React.StrictMode>
    <ChatWindow />
  </React.StrictMode>
); 