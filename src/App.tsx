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
import { useContextKeys } from './commands/contextKeys';
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

  const registerCommand = useCommandRegistry(state => state.registerCommand);
  const unregisterCommand = useCommandRegistry(state => state.unregisterCommand);
  const setContext = useContextKeys(state => state.setContext);

  // Initialize keybindings
  useKeybindings();

  // Initialize contexts
  useEffect(() => {
    // Set up initial contexts
    setContext('inZenMode', false);
    setContext('editorFocus', true);
    setContext('terminalFocus', false);
    setContext('chatFocus', false);
    setContext('sidebarVisible', isSidebarVisible);
    setContext('chatVisible', isChatVisible);
  }, [setContext, isSidebarVisible, isChatVisible]);

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

  useEffect(() => {
    // Register file-related commands
    registerCommand('workbench.action.files.openFile', handleOpenFolder);
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
      setContext('sidebarVisible', !isSidebarVisible);
    });

    registerCommand('workbench.action.toggleChat', () => {
      setIsChatVisible(!isChatVisible);
      setContext('chatVisible', !isChatVisible);
    });

    return () => {
      unregisterCommand('workbench.action.files.openFile');
      unregisterCommand('workbench.action.files.newFolder');
      unregisterCommand('workbench.action.files.save');
      unregisterCommand('workbench.action.files.saveAs');
      unregisterCommand('workbench.action.files.close');
      unregisterCommand('workbench.action.quit');
      unregisterCommand('workbench.action.toggleSidebarVisibility');
      unregisterCommand('workbench.action.toggleChat');
    };
  }, [registerCommand, unregisterCommand, workspacePath, createNewFile, createNewFolder,
    saveCurrentFile, saveFileAs, closeCurrentFile, isSidebarVisible, isChatVisible, handleOpenFolder, setContext]);

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

      {/* Top Bar */}
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

      {/* Main Content */}
      <div className="pt-14">
        <PanelGroup direction="horizontal" autoSaveId="app-layout">
          {/* File Tree */}
          {isSidebarVisible && (
            <>
              <Panel id="filetree" defaultSize={15} minSize={10} maxSize={30}>
                <div className="h-full border-r border-border/40">
                  <FileTreeContainer
                    nodes={tree}
                    onFolderClick={toggleFolder}
                    workspacePath={workspacePath || ''}
                  />
                </div>
              </Panel>
              <PanelResizeHandle className="w-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
            </>
          )}

          {/* Editor */}
          <Panel
            id="editor"
            defaultSize={isSidebarVisible ? (isChatVisible ? 65 : 85) : (isChatVisible ? 80 : 100)}
            minSize={40}
          >
            <EditorLayout />
          </Panel>

          {/* Chat */}
          {isChatVisible && (
            <>
              <PanelResizeHandle className="w-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
              <Panel
                id="chat"
                defaultSize={20}
                minSize={15}
                maxSize={40}
                order={2}
              >
                <div className="h-full border-l border-border/40">
                  <ChatSidebar onDetach={handleDetach} />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
};

export default App;
