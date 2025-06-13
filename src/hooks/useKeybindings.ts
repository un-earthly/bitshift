import { useEffect, useState } from 'react';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useCommandRegistry } from '../commands/registry';
import { useContextKeys } from '../commands/contextKeys';

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

export function useKeybindings() {
  const [keybindings, setKeybindings] = useState<Keybinding[]>([]);
  const executeCommand = useCommandRegistry(state => state.executeCommand);
  const evaluateWhen = useContextKeys(state => state.evaluateWhen);

  useEffect(() => {
    // Load keybindings using Tauri's filesystem API
    const loadKeybindings = async () => {
      try {
        const resourcePath = await resolveResource('assets/data/keybindings.json');
        const data = JSON.parse(await readTextFile(resourcePath));

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
      // Skip if target is an input, textarea, or terminal is focused
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        evaluateWhen('terminalFocused') // Check if terminal is focused
      ) {
        return;
      }

      // Build key combo string
      const modifiers: string[] = [];
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.shiftKey) modifiers.push('shift');
      if (event.altKey) modifiers.push('alt');
      if (event.metaKey) modifiers.push('cmd');

      const key = event.key.toLowerCase();
      const keyCombo = [...modifiers, key].join('+');

      // Find matching keybinding
      const keybinding = keybindings.find(kb => {
        const keys = kb.key.toLowerCase().split(' ');
        return keys[0] === keyCombo && (!kb.when || evaluateWhen(kb.when));
      });

      if (keybinding?.command) {
        // Stop the event immediately
        event.preventDefault();
        event.stopPropagation();

        // Execute command through the registry
        executeCommand(keybinding.command, keybinding.args);
      }
    };

    // Use capture phase to intercept events before they reach Monaco
    window.addEventListener('keydown', handleKeyEvent, true);
    return () => window.removeEventListener('keydown', handleKeyEvent, true);
  }, [keybindings, executeCommand, evaluateWhen]);
}