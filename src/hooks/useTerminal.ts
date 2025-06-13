import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UseTerminalOptions {
    onError?: (error: string) => void;
}

export function useTerminal(options: UseTerminalOptions = {}) {
    const { onError } = options;

    const startTerminal = useCallback(async (id: string) => {
        try {
            await invoke('start_pty', { id });
        } catch (err) {
            console.error('Failed to start PTY:', err);
            onError?.('Failed to start terminal process');
            throw err;
        }
    }, [onError]);

    const writeToTerminal = useCallback(async (id: string, data: string) => {
        try {
            await invoke('write_to_pty', { id, data });
        } catch (err) {
            console.error('Failed to write to PTY:', err);
            onError?.('Failed to send command to terminal');
            throw err;
        }
    }, [onError]);

    const closeTerminal = useCallback(async (id: string) => {
        try {
            await invoke('close_pty', { id });
        } catch (err) {
            console.error('Failed to close PTY:', err);
            onError?.('Failed to close terminal');
            throw err;
        }
    }, [onError]);

    const resizeTerminal = useCallback(async (id: string, rows: number, cols: number) => {
        try {
            await invoke('resize_pty', { id, rows, cols });
        } catch (err) {
            console.error('Failed to resize PTY:', err);
            // Don't show error to user for resize failures
        }
    }, []);

    return {
        startTerminal,
        writeToTerminal,
        closeTerminal,
        resizeTerminal,
    };
}