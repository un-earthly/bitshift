import React from 'react';
import Editor, { OnChange } from '@monaco-editor/react';
import '../styles/EditorView.css';

type Props = {
  filePath: string;
  content: string;
  onChange: (content: string) => void;
};

const EditorView: React.FC<Props> = ({ filePath, content, onChange }) => {
  // Get file extension to determine language
  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'rs':
        return 'rust';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      default:
        return 'plaintext';
    }
  };

  return (
    <div className="editor-view">
      <div className="editor-header">{filePath}</div>
      <Editor
        height="100%"
        defaultLanguage={getLanguage(filePath)}
        value={content}
        onChange={onChange as OnChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
};

export default EditorView;