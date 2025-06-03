import React from 'react';
import FileTree from './components/FileTree';
import EditorView from './components/EditorView';
import {useFileSystem} from './hooks/useFileSystem';
import { open } from '@tauri-apps/plugin-dialog';
import './App.css'; 

const App: React.FC = () => {
  const {
    tree,
    openFiles,
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
    </div>
  );
};

export default App;
