import React, { useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { getLanguage } from '@/lib/languages';
import * as monaco from 'monaco-editor';
import { useChatExtensionsStore } from '../store/chatExtensionsStore';

interface EditorViewProps {
  filePath: string;
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

const EditorView: React.FC<EditorViewProps> = ({
  filePath,
  content,
  onChange,
  className,
}) => {
  const {
    setCursorPosition,
    setSelectedText,
    setActiveFile,
  } = useChatExtensionsStore();

  useEffect(() => {
    setActiveFile(filePath);
    return () => setActiveFile(null);
  }, [filePath, setActiveFile]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Track cursor position
    editor.onDidChangeCursorPosition((e: monaco.editor.ICursorPositionChangedEvent) => {
      const position = e.position;
      setCursorPosition({
        line: position.lineNumber,
        column: position.column,
      });
    });

    // Track text selection
    editor.onDidChangeCursorSelection((e: monaco.editor.ICursorSelectionChangedEvent) => {
      const model = editor.getModel();
      if (model) {
        const selection = model.getValueInRange(e.selection);
        setSelectedText(selection || null);
      }
    });
  };

  return (
    <div className={cn('h-full w-full', className)}>
      <Editor
        height="100%"
        defaultLanguage={getLanguage(filePath)}
        value={content}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          lineHeight: 1.5,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          overviewRulerBorder: false,
          automaticLayout: true,
          quickSuggestions: { other: false, comments: false, strings: false },
          parameterHints: { enabled: false },
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnEnter: 'off',
          tabCompletion: 'off',
          wordBasedSuggestions: "allDocuments",
          padding: { top: 10, bottom: 10 },
          folding: true,
          foldingStrategy: 'indentation',
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: {
            enabled: true,
          },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          renderLineHighlight: 'all'
        }}
      />
    </div>
  );
};

export default EditorView;