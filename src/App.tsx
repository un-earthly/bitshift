import React from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import FileTree from './components/FileTree';
import EditorView from './components/EditorView';
import ChatSidebar from './components/ChatSidebar';
import {useFileSystem} from './hooks/useFileSystem';
import { open } from '@tauri-apps/plugin-dialog';
import './App.css'; 

const App: React.FC = () => {
  const {
    tree,
    activeFile,
    loadFolder,
    openFile,
    updateFileContent,
    toggleFolder,
  } = useFileSystem();

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
        <PanelResizeHandle />
        <Panel defaultSize={30} minSize={20}>
          <ChatSidebar />
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default App;
