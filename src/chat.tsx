import React from 'react';
import ReactDOM from 'react-dom/client';
import DetachedChat from './components/DetachedChat';
import './styles/ChatSidebar.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DetachedChat />
  </React.StrictMode>
); 