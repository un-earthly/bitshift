import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UseTerminalOptions {
    onError?: (error: string) => void;
}

export function useTerminal(options: UseTerminalOptions = {}) {
    const { onError } = options;

    const startTerminal = useCallback(async () => {
        try {
            await invoke('start_pty');
        } catch (err) {
            console.error('Failed to start PTY:', err);
            onError?.('Failed to start terminal process');
            throw err;
        }
    }, [onError]);

    const writeToTerminal = useCallback(async (data: string) => {
        try {
            await invoke('write_to_pty', { data });
        } catch (err) {
            console.error('Failed to write to PTY:', err);
            onError?.('Failed to send command to terminal');
            throw err;
        }
    }, [onError]);

    return {
        startTerminal,
        writeToTerminal,
    };
}