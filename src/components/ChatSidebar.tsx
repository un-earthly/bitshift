import React from 'react';
import { useChatState } from '../hooks/useChatState';
import Chat from './Chat';

const ChatSidebar: React.FC = () => {
  const { messages, isDetached, addMessage, handleDetach } = useChatState();

  if (isDetached) {
    return null;
  }

  return (
    <Chat
      messages={messages}
      onSendMessage={addMessage}
      onDetach={handleDetach}
      isDetached={false}
    />
  );
};

export default ChatSidebar; 