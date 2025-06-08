import { KeyboardEvent } from 'react';

export interface ShortcutHandlers {
    onNewFile?: () => void;
    onNewFolder?: () => void;
    onDelete?: () => void;
    onRename?: () => void;
    onCopy?: () => void;
    onCut?: () => void;
    onPaste?: () => void;
    onRefresh?: () => void;
}

export function handleKeyboardShortcut(e: globalThis.KeyboardEvent, handlers: ShortcutHandlers) {
    // Check for modifier keys
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    // New File: Cmd/Ctrl + N
    if (cmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        handlers.onNewFile?.();
        return;
    }

    // New Folder: Cmd/Ctrl + Shift + N
    if (cmdOrCtrl && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        handlers.onNewFolder?.();
        return;
    }

    // Delete: Delete key
    if (e.key === 'Delete' || (isMac && e.key === 'Backspace')) {
        e.preventDefault();
        handlers.onDelete?.();
        return;
    }

    // Rename: F2 or Enter
    if (e.key === 'F2' || e.key === 'Enter') {
        e.preventDefault();
        handlers.onRename?.();
        return;
    }

    // Copy: Cmd/Ctrl + C
    if (cmdOrCtrl && e.key === 'c') {
        e.preventDefault();
        handlers.onCopy?.();
        return;
    }

    // Cut: Cmd/Ctrl + X
    if (cmdOrCtrl && e.key === 'x') {
        e.preventDefault();
        handlers.onCut?.();
        return;
    }

    // Paste: Cmd/Ctrl + V
    if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault();
        handlers.onPaste?.();
        return;
    }

    // Refresh: Cmd/Ctrl + R
    if (cmdOrCtrl && e.key === 'r') {
        e.preventDefault();
        handlers.onRefresh?.();
        return;
    }
}

export function isModifierKey(e: KeyboardEvent) {
    return e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
}

export function getKeyboardShortcut(action: string): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? '⌘' : 'Ctrl';
    
    const shortcuts: { [key: string]: string } = {
        'new-file': `${cmdKey}+N`,
        'new-folder': `${cmdKey}+⇧+N`,
        'delete': isMac ? '⌫' : 'Del',
        'rename': 'F2',
        'copy': `${cmdKey}+C`,
        'cut': `${cmdKey}+X`,
        'paste': `${cmdKey}+V`,
        'refresh': `${cmdKey}+R`,
    };

    return shortcuts[action] || '';
} 