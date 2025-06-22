import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { writeFile, readTextFile, remove } from '@tauri-apps/plugin-fs';

interface ChatExtensionsState {
    // Cursor state
    cursorPosition: { line: number; column: number } | null;
    selectedText: string | null;
    activeFile: string | null;

    // Terminal state
    lastTerminalId: string | null;
    isTerminalBusy: boolean;

    // Actions
    setCursorPosition: (position: { line: number; column: number } | null) => void;
    setSelectedText: (text: string | null) => void;
    setActiveFile: (filePath: string | null) => void;
    setLastTerminalId: (id: string | null) => void;
    setIsTerminalBusy: (busy: boolean) => void;

    // Terminal operations
    runTerminalCommand: (command: string) => Promise<void>;

    // File operations
    createFile: (path: string, content: string) => Promise<void>;
    updateFile: (path: string, content: string) => Promise<void>;
    deleteFile: (path: string) => Promise<void>;
    readFile: (path: string) => Promise<string>;
}

export const useChatExtensionsStore = create<ChatExtensionsState>((set, get) => ({
    // Initial state
    cursorPosition: null,
    selectedText: null,
    activeFile: null,
    lastTerminalId: null,
    isTerminalBusy: false,

    // State setters
    setCursorPosition: (position) => set({ cursorPosition: position }),
    setSelectedText: (text) => set({ selectedText: text }),
    setActiveFile: (filePath) => set({ activeFile: filePath }),
    setLastTerminalId: (id) => set({ lastTerminalId: id }),
    setIsTerminalBusy: (busy) => set({ isTerminalBusy: busy }),

    // Terminal operations
    runTerminalCommand: async (command) => {
        const { lastTerminalId, isTerminalBusy } = get();
        if (!lastTerminalId || isTerminalBusy) return;

        set({ isTerminalBusy: true });
        try {
            await invoke('write_to_pty', {
                id: lastTerminalId,
                data: command + '\n'
            });
        } catch (error) {
            console.error('Failed to run terminal command:', error);
        } finally {
            set({ isTerminalBusy: false });
        }
    },

    // File operations
    createFile: async (path, content) => {
        try {
            const encoder = new TextEncoder();
            await writeFile(path, encoder.encode(content));
        } catch (error) {
            console.error('Failed to create file:', error);
            throw error;
        }
    },

    updateFile: async (path, content) => {
        try {
            const encoder = new TextEncoder();
            await writeFile(path, encoder.encode(content));
        } catch (error) {
            console.error('Failed to update file:', error);
            throw error;
        }
    },

    deleteFile: async (path) => {
        try {
            await remove(path);
        } catch (error) {
            console.error('Failed to delete file:', error);
            throw error;
        }
    },

    readFile: async (path) => {
        try {
            return await readTextFile(path);
        } catch (error) {
            console.error('Failed to read file:', error);
            throw error;
        }
    },
})); 