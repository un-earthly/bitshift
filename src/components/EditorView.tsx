import React, { useRef, useEffect } from 'react';
import Editor, { OnChange } from '@monaco-editor/react';
import '../styles/EditorView.css';
type Props = {
  path: string;
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
};

const EditorView: React.FC<Props> = ({ path, content, onChange, onSave }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  return (
    <div className="editor-view">
      <div className="editor-header">{path}</div>
          <Editor
            height="100%"
            defaultLanguage="python"
            defaultValue={content}
            value={content}
            onChange={onChange as OnChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{ fontSize: 14, minimap: { enabled: false }, wordWrap: 'on' }}
          />
    </div>
  );
};

export default EditorView;