import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { ChatSidebar } from './components/ChatSidebar';
import { useFileSystem } from './hooks/useFileSystem';
import { open } from '@tauri-apps/plugin-dialog';
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Button } from './components/ui/button';
import { useTheme } from './components/theme-provider';
import { FolderOpen, Moon, Sun, MessageSquare } from 'lucide-react';
import { Separator } from './components/ui/separator';
import { EditorLayout } from './components/EditorLayout';
import { FileTreeContainer } from './components/FileTreeContainer';
import { useKeybindings } from './hooks/useKeybindings';
import { useCommandRegistry } from './commands/registry';
import { Toaster } from 'sonner';
import './App.css';

const App: React.FC = () => {
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const { theme, setTheme } = useTheme();
  const {
    tree,
    loadFolder,
    toggleFolder,
    workspacePath,
    createNewFile,
    createNewFolder,
    saveCurrentFile,
    saveFileAs,
    closeCurrentFile,
  } = useFileSystem();

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        await loadFolder(selected);
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  const registerCommand = useCommandRegistry(state => state.registerCommand);
  const unregisterCommand = useCommandRegistry(state => state.unregisterCommand);

  // Initialize keybindings
  useKeybindings();

  useEffect(() => {
    // Register file-related commands
    registerCommand('workbench.action.files.openFile', handleOpenFolder);
    registerCommand('workbench.action.files.newFile', async () => {
      if (!workspacePath) return;
      const fileName = 'untitled.txt';
      await createNewFile(`${workspacePath}/${fileName}`);
    });

    registerCommand('workbench.action.files.newFolder', async () => {
      if (!workspacePath) return;
      const folderName = 'new-folder';
      await createNewFolder(`${workspacePath}/${folderName}`);
    });

    registerCommand('workbench.action.files.save', saveCurrentFile);
    registerCommand('workbench.action.files.saveAs', saveFileAs);
    registerCommand('workbench.action.files.close', closeCurrentFile);
    registerCommand('workbench.action.quit', () => window.close());

    // Register workbench commands
    registerCommand('workbench.action.toggleSidebarVisibility', () => {
      setIsSidebarVisible(!isSidebarVisible);
    });

    registerCommand('workbench.action.toggleChat', () => {
      setIsChatVisible(!isChatVisible);
    });

    // Cleanup on unmount
    return () => {
      unregisterCommand('workbench.action.files.openFile');
      unregisterCommand('workbench.action.files.newFile');
      unregisterCommand('workbench.action.files.newFolder');
      unregisterCommand('workbench.action.files.save');
      unregisterCommand('workbench.action.files.saveAs');
      unregisterCommand('workbench.action.files.close');
      unregisterCommand('workbench.action.quit');
      unregisterCommand('workbench.action.toggleSidebarVisibility');
      unregisterCommand('workbench.action.toggleChat');
    };
  }, [registerCommand, unregisterCommand, workspacePath, createNewFile, createNewFolder,
    saveCurrentFile, saveFileAs, closeCurrentFile, isSidebarVisible, isChatVisible, handleOpenFolder]);

  useEffect(() => {
    const checkDetachedWindow = async () => {
      const chatWindow = await WebviewWindow.getByLabel("chat");
      if (chatWindow) {
        setIsChatVisible(false);
      }
    };
    checkDetachedWindow();
  }, []);

  const handleDetach = async () => {
    setIsChatVisible(false);

    const chatWindow = new WebviewWindow("chat", {
      url: "chat.html",
      title: "Chat",
      width: 400,
      height: 600,
    });

    const unlisten = await chatWindow.onCloseRequested(async () => {
      setIsChatVisible(true);
      unlisten();
    });

    chatWindow.once("tauri://error", (e) => {
      console.error("Failed to create chat window:", e);
      setIsChatVisible(true);
    });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <Toaster richColors position="top-right" />
      <div className="absolute top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button onClick={handleOpenFolder} variant="outline" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Open Folder
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsChatVisible(!isChatVisible)}
              className="h-8 w-8"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="h-8 w-8"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-14 h-full flex flex-col">
        <div className="flex-1">
          <PanelGroup direction="horizontal" className="h-full">
            {isSidebarVisible && (
              <>
                <Panel
                  defaultSize={20}

                  className="border-r border-border/40"
                >
                  <div className="flex h-full flex-col bg-muted/30">
                    <div className="flex-1 overflow-auto p-2">
                      <FileTreeContainer
                        nodes={tree}
                        onFolderClick={toggleFolder}
                        workspacePath={workspacePath || ''}
                      />
                    </div>
                  </div>
                </Panel>
                <PanelResizeHandle className="w-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
              </>
            )}

            <Panel
              defaultSize={50}

              className="bg-background"
            >
              <EditorLayout />
            </Panel>

            {isChatVisible && (
              <>
                <PanelResizeHandle className="w-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
                <Panel
                  defaultSize={30}
                  className="border-l border-border/40"
                >
                  <ChatSidebar onDetach={handleDetach} />
                </Panel>
              </>
            )}
          </PanelGroup>
        </div>
      </div>
    </div>
  );
};

export default App;
