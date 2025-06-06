import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export const useChatState = () => {
  const state = useChatStore();

  useEffect(() => {
    state.fetchAvailableModels();
  }, [state.fetchAvailableModels]);

  return state;
};