import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { getLanguage } from '@/lib/languages';
import * as monaco from 'monaco-editor';
import { useChatExtensionsStore } from '../store/chatExtensionsStore';
import { MonacoAIProvider } from '../services/monacoAIProvider';

interface EditorViewProps {
  filePath: string;
  content: string;
  onChange: (content: string) => void;
  className?: string;
  onAIProviderReady?: (provider: MonacoAIProvider) => void;
  onAIProviderDispose?: () => void;
}

const EditorView: React.FC<EditorViewProps> = ({
  filePath,
  content,
  onChange,
  className,
  onAIProviderReady,
  onAIProviderDispose,
}) => {
  const {
    setCursorPosition,
    setSelectedText,
    setActiveFile,
  } = useChatExtensionsStore();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const aiProviderRef = useRef<MonacoAIProvider | null>(null);
  const disposablesRef = useRef<monaco.IDisposable[]>([]);

  useEffect(() => {
    setActiveFile(filePath);
    return () => setActiveFile(null);
  }, [filePath, setActiveFile]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Initialize AI provider
    aiProviderRef.current = new MonacoAIProvider(editor);

    // Register the AI completion provider
    const disposable = monaco.languages.registerCompletionItemProvider(
      ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'cpp', 'csharp'],
      aiProviderRef.current
    );
    disposablesRef.current.push(disposable);

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

    // Add keyboard shortcuts for AI code generation
    const keybindings = [
      // Ctrl+Shift+Space: Trigger AI suggestion
      {
        id: 'ai-suggestion',
        label: 'Trigger AI Suggestion',
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space,
        run: () => {
          aiProviderRef.current?.triggerAISuggestion();
          return Promise.resolve();
        }
      },
      // Ctrl+Shift+F: Generate function
      {
        id: 'ai-generate-function',
        label: 'Generate Function',
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        run: () => {
          aiProviderRef.current?.generateFunction();
          return Promise.resolve();
        }
      },
      // Ctrl+Shift+C: Generate class
      {
        id: 'ai-generate-class',
        label: 'Generate Class',
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
        run: () => {
          aiProviderRef.current?.generateClass();
          return Promise.resolve();
        }
      },
      // Ctrl+Shift+I: Generate imports
      {
        id: 'ai-generate-imports',
        label: 'Generate Imports',
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI,
        run: () => {
          aiProviderRef.current?.generateImports();
          return Promise.resolve();
        }
      }
    ];

    // Register keybindings using Monaco's command service
    keybindings.forEach(binding => {
      const disposable = monaco.editor.registerCommand(binding.id, binding.run);
      disposablesRef.current.push(disposable);
    });

    // Add custom actions to the editor
    const actions = [
      {
        id: 'ai-suggestion-action',
        label: 'AI Suggestion',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space],
        run: () => aiProviderRef.current?.triggerAISuggestion()
      },
      {
        id: 'ai-generate-function-action',
        label: 'Generate Function',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
        run: () => aiProviderRef.current?.generateFunction()
      },
      {
        id: 'ai-generate-class-action',
        label: 'Generate Class',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC],
        run: () => aiProviderRef.current?.generateClass()
      },
      {
        id: 'ai-generate-imports-action',
        label: 'Generate Imports',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI],
        run: () => aiProviderRef.current?.generateImports()
      }
    ];

    actions.forEach(action => {
      const disposable = editor.addAction(action);
      if (disposable) {
        disposablesRef.current.push(disposable);
      }
    });

    if (onAIProviderReady && aiProviderRef.current) {
      onAIProviderReady(aiProviderRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(disposable => disposable.dispose());
      disposablesRef.current = [];
      aiProviderRef.current?.dispose();
      if (onAIProviderDispose) {
        onAIProviderDispose();
      }
    };
  }, []);

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
          minimap: { enabled: true },
          scrollBeyondLastLine: true,
          overviewRulerBorder: false,
          automaticLayout: true,
          quickSuggestions: { other: true, comments: true, strings: true },
          parameterHints: { enabled: true },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'smart',
          tabCompletion: 'on',
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
          renderLineHighlight: 'all',
          // Enhanced AI suggestions
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showClasses: true,
            showFunctions: true,
            showVariables: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showWords: true,
            showUsers: true,
            showIssues: true,
          }
        }}
      />
    </div>
  );
};

export default EditorView;