import React, { useEffect } from 'react';
import FileTree from './components/FileTree';
import EditorView from './components/EditorView';
import useFileSystem from './hooks/useFileSystem';
import { open } from '@tauri-apps/plugin-dialog';
import './App.css'; // Import the CSS file

const App: React.FC = () => {
  const {
    tree,
    openFiles,
    activeFile,
    loadFolder,
    openFile,
    updateFileContent,
    setActivePath
  } = useFileSystem();

  useEffect(() => {
    loadFolder('/home/normod/projects');
  }, []);

  return (
    <div className="app-container">
      <div className="sidebar">
        <button
          onClick={async () => {
            const selected = await open({ directory: true });
            if (typeof selected === 'string') {
              loadFolder(selected);
            }
          }}
          className="open-folder-btn"
        >
          Open Folder
        </button>
        <FileTree nodes={tree} onFileClick={openFile} />
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
