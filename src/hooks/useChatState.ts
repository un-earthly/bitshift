import { useState, useEffect, useCallback } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatState {
  messages: Message[];
  isDetached: boolean;
  detachedWindow: WebviewWindow | null;
}

export const useChatState = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isDetached: false,
    detachedWindow: null
  });

  const addMessage = useCallback((message: Message) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));

    // If window is detached, send message to detached window
    if (state.detachedWindow) {
      state.detachedWindow.emit('new-message', message);
    }
  }, [state.detachedWindow]);

  const handleDetach = useCallback(async () => {
    try {
      const chatWindow = new WebviewWindow('chat', {
        url: 'chat.html',
        title: 'Chat',
        width: 400,
        height: 600,
        decorations: true,
        resizable: true
      });

      chatWindow.once('tauri://created', () => {
        setState(prev => ({
          ...prev,
          isDetached: true,
          detachedWindow: chatWindow
        }));
      });

      chatWindow.once('tauri://error', (e) => {
        console.error('Error creating chat window:', e);
      });

      chatWindow.once('tauri://close-requested', () => {
        setState(prev => ({
          ...prev,
          isDetached: false,
          detachedWindow: null
        }));
      });

    } catch (error) {
      console.error('Failed to create chat window:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.detachedWindow) {
        state.detachedWindow.close();
      }
    };
  }, [state.detachedWindow]);

  return {
    messages: state.messages,
    isDetached: state.isDetached,
    addMessage,
    handleDetach
  };
}; 