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
import { Button } from './components/ui/button';
import { useTheme } from './components/theme-provider';

const App: React.FC = () => {
  const [isChatVisible, setIsChatVisible] = useState(true);
  const { theme, setTheme } = useTheme();

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

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <PanelGroup 
        direction="horizontal" 
        className="h-full"
      >
        <Panel 
          defaultSize={20} 
          minSize={10}
          className="border-r border-border/40"
        >
          <div className="flex h-full flex-col bg-muted/40">
            <div className="flex flex-col gap-2 p-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <Button 
                  onClick={handleOpenFolder} 
                  variant="outline"
                  className="flex-1"
                >
                  Open Folder
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="ml-2"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <FileTree 
                nodes={tree} 
                onFileClick={openFile}
                onFolderClick={toggleFolder}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-border/40 hover:bg-border/60 transition-colors" />

        <Panel 
          defaultSize={50} 
          minSize={30}
          className="bg-background"
        >
          <div className="h-full">
            {activeFile ? (
              <EditorView
                filePath={activeFile.path}
                content={activeFile.content}
                onChange={updateFileContent}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Open a file to start editing
              </div>
            )}
          </div>
        </Panel>

        {isChatVisible && (
          <>
            <PanelResizeHandle className="w-2 bg-border/40 hover:bg-border/60 transition-colors" />
            <Panel 
              defaultSize={30} 
              minSize={20}
              className="border-l border-border/40"
            >
              <ChatSidebar onDetach={handleDetach} />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};

export default App;
