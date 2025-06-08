import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { getLanguage } from '@/lib/languages';
import { useKeybindings } from '@/hooks/useKeybindings';
import type { 
  EditorPosition, 
  EditorSelection, 
  EditorState,
  ExtendedDirection,
  ScrollAmount
} from '@/lib/types/keybindings';
import * as monaco from 'monaco-editor';

// Define global keybindings that should always work
const GLOBAL_KEYBINDINGS = [
  { keyCode: monaco.KeyCode.KeyB, modifiers: monaco.KeyMod.CtrlCmd }, // Ctrl+B for sidebar
  { keyCode: monaco.KeyCode.KeyI, modifiers: monaco.KeyMod.CtrlCmd }, // Ctrl+I for chat
  { keyCode: monaco.KeyCode.KeyP, modifiers: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift }, // Ctrl+Shift+P for command palette
];

interface EditorViewProps {
  filePath: string;
  content: string;
  onChange: (value: string) => void;
  className?: string;
}

const EditorView: React.FC<EditorViewProps> = ({
  filePath,
  content,
  onChange,
  className,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({
    position: { lineNumber: 1, column: 1 },
    selection: null,
    scrollTop: 0,
    scrollLeft: 0,
  });

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Set up editor state tracking
    editor.onDidChangeCursorPosition(e => {
      setEditorState(prev => ({
        ...prev,
        position: e.position
      }));
    });

    editor.onDidChangeCursorSelection(e => {
      setEditorState(prev => ({
        ...prev,
        selection: e.selection
      }));
    });

    editor.onDidScrollChange(e => {
      setEditorState(prev => ({
        ...prev,
        scrollTop: e.scrollTop,
        scrollLeft: e.scrollLeft
      }));
    });
  };

  // Cursor movement handlers
  const handleCursorMove = (direction: ExtendedDirection) => {
    const editor = editorRef.current;
    if (!editor) return;

    const position = editor.getPosition();
    if (!position) return;

    let newPosition: EditorPosition;
    switch (direction) {
      case 'up':
        newPosition = { lineNumber: position.lineNumber - 1, column: position.column };
        break;
      case 'down':
        newPosition = { lineNumber: position.lineNumber + 1, column: position.column };
        break;
      case 'left':
        newPosition = { lineNumber: position.lineNumber, column: position.column - 1 };
        break;
      case 'right':
        newPosition = { lineNumber: position.lineNumber, column: position.column + 1 };
        break;
      case 'home':
        newPosition = { lineNumber: position.lineNumber, column: 1 };
        break;
      case 'end': {
        const lineContent = editor.getModel()?.getLineContent(position.lineNumber) || '';
        newPosition = { lineNumber: position.lineNumber, column: lineContent.length + 1 };
        break;
      }
      case 'top':
        newPosition = { lineNumber: 1, column: 1 };
        break;
      case 'bottom': {
        const lineCount = editor.getModel()?.getLineCount() || 1;
        newPosition = { lineNumber: lineCount, column: 1 };
        break;
      }
      default:
        return;
    }

    editor.setPosition(newPosition);
  };

  // Selection handlers
  const handleCursorSelect = (direction: ExtendedDirection) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection) return;

    let newSelection: EditorSelection;
    switch (direction) {
      case 'up':
        newSelection = {
          ...selection,
          endLineNumber: selection.endLineNumber - 1
        };
        break;
      case 'down':
        newSelection = {
          ...selection,
          endLineNumber: selection.endLineNumber + 1
        };
        break;
      case 'left':
        newSelection = {
          ...selection,
          endColumn: selection.endColumn - 1
        };
        break;
      case 'right':
        newSelection = {
          ...selection,
          endColumn: selection.endColumn + 1
        };
        break;
      case 'home':
        newSelection = {
          ...selection,
          endColumn: 1
        };
        break;
      case 'end': {
        const lineContent = editor.getModel()?.getLineContent(selection.endLineNumber) || '';
        newSelection = {
          ...selection,
          endColumn: lineContent.length + 1
        };
        break;
      }
      case 'top':
        newSelection = {
          ...selection,
          endLineNumber: 1,
          endColumn: 1
        };
        break;
      case 'bottom': {
        const lineCount = editor.getModel()?.getLineCount() || 1;
        newSelection = {
          ...selection,
          endLineNumber: lineCount,
          endColumn: 1
        };
        break;
      }
      default:
        return;
    }

    editor.setSelection(newSelection);
  };

  // Column selection handlers
  const handleColumnSelect = (direction: 'up' | 'down' | 'left' | 'right' | 'pageup' | 'pagedown') => {
    const editor = editorRef.current;
    if (!editor) return;

    // Implement column selection logic
    editor.trigger('keyboard', 'editor.action.columnSelect' + direction.charAt(0).toUpperCase() + direction.slice(1), {});
  };

  // Scroll handlers
  const handleScroll = (direction: 'up' | 'down', amount: ScrollAmount) => {
    const editor = editorRef.current;
    if (!editor) return;

    const scrollAmount = amount === 'line' ? 20 : editor.getLayoutInfo().height;
    const delta = direction === 'up' ? -scrollAmount : scrollAmount;
    
    editor.setScrollTop(editor.getScrollTop() + delta);
  };

  // Selection operation handlers
  const handleSelectAll = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const lastLine = model.getLineCount();
    const lastLineLength = model.getLineLength(lastLine);

    editor.setSelection({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: lastLine,
      endColumn: lastLineLength + 1
    });
  };

  const handleCancelSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const position = editor.getPosition();
    if (position) {
      editor.setPosition(position);
    }
  };

  const handleExpandLineSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('keyboard', 'expandLineSelection', {});
  };

  const handleRemoveSecondaryCursors = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('keyboard', 'removeSecondaryCursors', {});
  };

  // Text editing handlers
  const handleDelete = (direction: 'left' | 'right') => {
    const editor = editorRef.current;
    if (!editor) return;

    if (direction === 'left') {
      editor.trigger('keyboard', 'deleteLeft', {});
    } else {
      editor.trigger('keyboard', 'deleteRight', {});
    }
  };

  const handleTab = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('keyboard', 'tab', {});
  };

  const handleIndent = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('keyboard', 'editor.action.indentLines', {});
  };

  const handleOutdent = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('keyboard', 'editor.action.outdentLines', {});
  };

  // View operation handlers
  const handleExitZenMode = () => {
    setIsZenMode(false);
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('keyboard', 'workbench.action.exitZenMode', {});
  };

  // Register all keybinding handlers
  useKeybindings({
    // Cursor movement
    onCursorMove: handleCursorMove,
    onCursorSelect: handleCursorSelect,
    onCursorColumnSelect: handleColumnSelect,

    // Selection operations
    onSelectAll: handleSelectAll,
    onCancelSelection: handleCancelSelection,
    onExpandLineSelection: handleExpandLineSelection,
    onRemoveSecondaryCursors: handleRemoveSecondaryCursors,

    // Scrolling
    onScroll: handleScroll,

    // Text editing
    onDelete: handleDelete,
    onTab: handleTab,
    onIndent: handleIndent,
    onOutdent: handleOutdent,

    // View operations
    onExitZenMode: handleExitZenMode,
  });

  return (
    <div className={cn('h-full w-full', className)}>
      <Editor
        height="100%"
        defaultLanguage={getLanguage(filePath)}
        defaultValue={content}
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