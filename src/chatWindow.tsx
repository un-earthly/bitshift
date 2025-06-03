import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWebview } from "@tauri-apps/api/webview";
import './styles/ChatSidebar.css';
import { Message } from './hooks/useChatState';
import Chat from './components/Chat';

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);

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

  const handleSendMessage = async (message: Message) => {
    setMessages(prev => [...prev, message]);

    // Mock response
    setTimeout(() => {
      const response: Message = {
        role: 'assistant',
        content: 'This is a mock response. Implement actual chat functionality here.'
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  return (
    <Chat
      messages={messages}
      onSendMessage={handleSendMessage}
      isDetached={true}
    />
  );
};

ReactDOM.createRoot(document.getElementById('chat-root') as HTMLElement).render(
  <React.StrictMode>
    <ChatWindow />
  </React.StrictMode>
); 