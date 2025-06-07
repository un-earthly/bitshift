import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { homeDir, resolve } from '@tauri-apps/api/path';

export const useTerminal = () => {
    const [history, setHistory] = useState<string[]>([]);
    const [currentDirectory, setCurrentDirectory] = useState<string>('~');

    // Initialize with user's home directory
    useEffect(() => {
        homeDir().then(home => {
            setCurrentDirectory(home);
        }).catch(console.error);
    }, []);

    const executeCommand = useCallback(async (command: string) => {
        try {
            // Handle cd commands specially
            if (command.startsWith('cd ')) {
                const newDir = command.slice(3).trim();
                // Resolve the new path relative to current directory
                const resolvedPath = await resolve(
                    newDir.startsWith('/') ? newDir : `${currentDirectory}/${newDir}`
                );
                setCurrentDirectory(resolvedPath);
                return '';
            }

            const output = await invoke<string>('execute_command', {
                command: `cd "${currentDirectory}" && ${command}`
            });
            setHistory(prev => [...prev, `$ ${command}`, output]);
            return output;
        } catch (error) {
            const errorMessage = `Error: ${error}`;
            setHistory(prev => [...prev, `$ ${command}`, errorMessage]);
            return errorMessage;
        }
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return {
        history,
        currentDirectory,
        executeCommand,
        clearHistory,
    };
};
