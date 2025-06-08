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
import { Toaster } from 'sonner';
import './App.css';

const App: React.FC = () => {
  const [isChatVisible, setIsChatVisible] = useState(true);
  const { theme, setTheme } = useTheme();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

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

  useKeybindings({
    onNewFile: async () => {
      if (!workspacePath) return;
      const fileName = 'untitled.txt';
      await createNewFile(`${workspacePath}/${fileName}`);
    },
    onNewFolder: async () => {
      if (!workspacePath) return;
      const folderName = 'new-folder';
      await createNewFolder(`${workspacePath}/${folderName}`);
    },
    onSave: async () => {
      await saveCurrentFile();
    },
    onSaveAs: async () => {
      await saveFileAs();
    },
    onClose: () => {
      closeCurrentFile();
    },
    onQuit: () => {
      window.close();
    },
    onUndo: () => {
      document.execCommand('undo');
    },
    onRedo: () => {
      document.execCommand('redo');
    },
    onCut: () => {
      document.execCommand('cut');
    },
    onCopy: () => {
      document.execCommand('copy');
    },
    onPaste: () => {
      document.execCommand('paste');
    },
    onFind: () => {
      document.dispatchEvent(new CustomEvent('editor-find'));
    },
    onReplace: () => {
      document.dispatchEvent(new CustomEvent('editor-replace'));
    },
    'workbench.action.showCommands': () => {
      console.log('Opening command palette');
      // Implement your command palette logic here
    },
    'workbench.action.toggleChat': () => {
      setIsChatVisible(!isChatVisible);
      console.log('Toggling chat visibility');
    },
    'workbench.action.toggleSidebarVisibility': () => {
      setIsSidebarVisible(!isSidebarVisible);
      console.log('Toggling sidebar visibility, new state:', !isSidebarVisible);
    }
  });

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
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <Toaster richColors position="top-right" />
      {/* Top Header */}
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
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {theme === 'light' ?
                <Moon className="h-4 w-4" /> :
                <Sun className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-14 h-full">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel
            defaultSize={20}
            minSize={15}
            className="border-r border-border/40"
            style={{ display: isSidebarVisible ? 'block' : 'none' }}
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

          <Panel
            defaultSize={50}
            minSize={30}
            className="bg-background"
          >
            <EditorLayout />
          </Panel>

          {isChatVisible && (
            <>
              <PanelResizeHandle className="w-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
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
    </div>
  );
};

export default App;
