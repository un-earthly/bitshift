import React from 'react';
import LlamaChat from './LlamaChat';
import './../styles/Chat.css';

const ChatSidebar: React.FC = () => {
  return (
    <div className="chat-sidebar-container">
      <LlamaChat />
    </div>
  );
};

export default ChatSidebar; 