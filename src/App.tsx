import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import FileTree from './components/FileTree';
import EditorView from './components/EditorView';
import {ChatSidebar} from './components/ChatSidebar';
import {useFileSystem} from './hooks/useFileSystem';
import { open } from '@tauri-apps/plugin-dialog';
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import './App.css'; 

const App: React.FC = () => {
  const [isChatVisible, setIsChatVisible] = useState(true);

  const {
    tree,
    activeFile,
    loadFolder,
    openFile,
    updateFileContent,
    toggleFolder,
  } = useFileSystem();

  useEffect(() => {
    const checkDetachedWindow = async () => {
      const chatWindow = await WebviewWindow.getByLabel("chat");
      if (chatWindow) {
        setIsChatVisible(false);
      }
    };
    checkDetachedWindow();
  }, []);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      console.log(selected);
      if (selected && typeof selected === 'string') {
        await loadFolder(selected);
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  const handleDetach = async () => {
    // Hide the sidebar immediately
    setIsChatVisible(false);

    // Create the new window
    const chatWindow = new WebviewWindow("chat", {
      url: "chat.html",
      title: "Chat",
      width: 400,
      height: 600,
    });
    
    // Listen for the detached window to be closed
    const unlisten = await chatWindow.onCloseRequested(async () => {
      // When it's closed, show the sidebar again
      setIsChatVisible(true);
      unlisten();
    });

    chatWindow.once("tauri://error", (e) => {
      console.error("Failed to create chat window:", e);
      // If the window fails to open, show the sidebar again
      setIsChatVisible(true);
    });
  };

  return (
    <div className="app-container">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={10}>
          <div className="sidebar">
            <button onClick={handleOpenFolder} className="open-folder-btn">
              Open Folder
            </button>
            <FileTree 
              nodes={tree} 
              onFileClick={openFile}
              onFolderClick={toggleFolder}
            />
          </div>
        </Panel>
        <PanelResizeHandle />
        <Panel defaultSize={50} minSize={30}>
          <div className="editor-area">
            {activeFile ? (
              <EditorView
                filePath={activeFile.path}
                content={activeFile.content}
                onChange={updateFileContent}
              />
            ) : (
              <div className="placeholder-text">
                Open a file to start editing
              </div>
            )}
          </div>
        </Panel>
        {isChatVisible && (
          <>
            <PanelResizeHandle />
            <Panel defaultSize={30} minSize={20}>
              <ChatSidebar onDetach={handleDetach} />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};

export default App;
