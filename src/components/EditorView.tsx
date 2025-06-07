import React from 'react';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';

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
  className
}) => {
  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rs': 'rust',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'toml': 'toml',
      'sql': 'sql',
      'graphql': 'graphql',
      'prisma': 'prisma',
      'sh': 'shell',
      'bash': 'shell',
      'go': 'go',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'cpp',
      'hpp': 'cpp',
      'java': 'java',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'vue': 'vue',
      'xml': 'xml',
      'dockerfile': 'dockerfile',
    };
    return languageMap[ext] || 'plaintext';
  };

  return (
    <div className={cn("h-full w-full flex flex-col", className)}>
      <Editor
        height="100%"
        defaultValue={content}
        defaultLanguage={getLanguage(filePath)}
        onChange={(value) => onChange(value || '')}
        theme="vs-dark"
        options={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          lineHeight: 1.5,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          folding: true,
          foldingStrategy: 'indentation',
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          padding: { top: 10, bottom: 10 },
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
          renderLineHighlight: 'all',
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          acceptSuggestionOnEnter: 'on',
        }}
      />
    </div>
  );
};

export default EditorView;