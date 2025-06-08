import { useEffect, useCallback, useRef, useState } from 'react';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';


interface Keybinding {
  key: string;
  command: string;
  when?: string;
  args?: Record<string, unknown>;
}

export interface CursorHandlers {
  onCursorMove?: (direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'top' | 'bottom') => void;
  onCursorSelect?: (direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'top' | 'bottom') => void;
  onCursorColumnSelect?: (direction: 'up' | 'down' | 'left' | 'right' | 'pageup' | 'pagedown') => void;
}

export interface SelectionHandlers {
  onSelectAll?: () => void;
  onCancelSelection?: () => void;
  onExpandLineSelection?: () => void;
  onRemoveSecondaryCursors?: () => void;
}

export interface ScrollHandlers {
  onScroll?: (direction: 'up' | 'down', amount: 'line' | 'page') => void;
}

export interface EditHandlers {
  onDelete?: (direction: 'left' | 'right') => void;
  onIndent?: () => void;
  onOutdent?: () => void;
  onTab?: () => void;
}

export interface FileHandlers {
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onClose?: () => void;
  onQuit?: () => void;
}

export interface ClipboardHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
}

export interface SearchHandlers {
  onFind?: () => void;
  onReplace?: () => void;
}

export interface ViewHandlers {
  onExitZenMode?: () => void;
  onCloseReferenceSearch?: () => void;
  onHideInlineSuggest?: () => void;
}

export interface NotebookHandlers {
  onNotebookCellChatArrowOut?: (direction: 'up' | 'down') => void;
  onFocusChatWidget?: () => void;
}

export interface WorkbenchHandlers {
  onShowCommands?: () => void;
  onToggleChat?: () => void;
  onToggleSidebar?: () => void;
}

interface KeybindingHandlers {
  [command: string]: (...args: any[]) => void;
}

export function useKeybindings(handlers: KeybindingHandlers) {
  const handlerRef = useRef<KeybindingHandlers>(handlers);
  const [keybindings, setKeybindings] = useState<Keybinding[]>([]);
  handlerRef.current = handlers;

  useEffect(() => {
    // Load keybindings using Tauri's filesystem API
    const loadKeybindings = async () => {
      try {


        // try {
        const resourcePath = await resolveResource('assets/data/keybindings.json');
        console.log('Resource path:', resourcePath);
        
        const data = JSON.parse(await readTextFile(resourcePath));
        console.log('Data:', data);
        if (!Array.isArray(data)) {
          throw new Error('Keybindings data is not an array');
        }

        setKeybindings(data);
      } catch (error) {
        console.error('Error loading keybindings:', error);
        setKeybindings([]);
      }
    };

    loadKeybindings();
  }, []);

  useEffect(() => {
    const handleKeyEvent = (event: KeyboardEvent) => {
      // Log the raw event first
      console.log('KeyboardEvent:', {
        key: event.key,
        ctrlKey: event.ctrlKey,
        target: event.target
      });

      // Build key combination string (e.g., "ctrl+k ctrl+c")
      const modifiers = [];
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.shiftKey) modifiers.push('shift');
      if (event.altKey) modifiers.push('alt');
      if (event.metaKey) modifiers.push('cmd');
      
      const key = event.key.toLowerCase();
      const keyCombo = [...modifiers, key].join('+');
      console.log('Pressed key combo:', keyCombo);

      // Find matching keybinding
      const keybinding = keybindings.find(kb => {
        const keys = kb.key.toLowerCase().split(' ');
        const matches = keys[0] === keyCombo;
        if (keyCombo === 'ctrl+b') {
          console.log('Found ctrl+b keybinding:', kb);
        }
        console.log('Checking keybinding:', kb.key, 'matches  :', matches);
        return matches;
      });

      if (keybinding?.command) {
        console.log('Found keybinding:', keybinding);
        // Stop the event immediately
        event.preventDefault();
        event.stopPropagation();

        // Execute handler if it exists
        const handler = handlerRef.current[keybinding.command];
        if (handler) {
          console.log('Executing handler for command:', keybinding.command);
          handler(keybinding.args);
        } else {
          console.log('No handler found for command:', keybinding.command);
        }
      } else {
        console.log('No keybinding found for combo:', keyCombo);
      }
    };

    // Use capture phase to intercept events before they reach Monaco
    window.addEventListener('keydown', handleKeyEvent, true);
    return () => window.removeEventListener('keydown', handleKeyEvent, true);
  }, [keybindings]);
}