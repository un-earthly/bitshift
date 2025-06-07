import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { homeDir, resolve, normalize } from '@tauri-apps/api/path';
import { DirEntry, readDir } from '@tauri-apps/plugin-fs';

interface AutocompleteResult {
    suggestions: string[];
    partialPath: string;
}

const TERMINAL_STATE_KEY = 'terminal_state';

interface TerminalState {
    currentDirectory: string;
}

export const useTerminal = () => {
    const [history, setHistory] = useState<string[]>([]);
    const [currentDirectory, setCurrentDirectory] = useState<string>('');
    const [homeDirPath, setHomeDirPath] = useState<string>('');
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);

    // Initialize with user's home directory
    useEffect(() => {
        const initializeTerminal = async () => {
            try {
                const home = await homeDir();
                setHomeDirPath(home);

                // Try to restore the last working directory from localStorage
                const savedState = localStorage.getItem(TERMINAL_STATE_KEY);
                if (savedState) {
                    const { currentDirectory: savedDirectory } = JSON.parse(savedState) as TerminalState;
                    // Verify the directory still exists
                    try {
                        await readDir(savedDirectory);
                        setCurrentDirectory(savedDirectory);
                        return;
                    } catch (error) {
                        console.warn('Saved directory no longer exists, falling back to home directory');
                    }
                }

                // Fall back to home directory if no saved state or directory doesn't exist
                setCurrentDirectory(home);
            } catch (error) {
                console.error('Error initializing terminal:', error);
            }
        };

        initializeTerminal();
    }, []);

    // Save current directory to localStorage whenever it changes
    useEffect(() => {
        if (currentDirectory) {
            const state: TerminalState = {
                currentDirectory
            };
            localStorage.setItem(TERMINAL_STATE_KEY, JSON.stringify(state));
        }
    }, [currentDirectory]);

    const formatDisplayPath = useCallback((path: string) => {
        if (!homeDirPath) return path;
        return path.startsWith(homeDirPath) ? path.replace(homeDirPath, '~') : path;
    }, [homeDirPath]);

    const resolveSpecialPath = async (path: string): Promise<string> => {
        if (!path) return currentDirectory;

        // Handle home directory
        if (path === '~' || path.startsWith('~/')) {
            const resolvedPath = path === '~' ? homeDirPath : path.replace('~', homeDirPath);
            return normalize(resolvedPath);
        }

        // Handle absolute paths
        if (path.startsWith('/')) {
            return normalize(path);
        }

        // Handle relative paths
        const resolvedPath = await resolve(`${currentDirectory}/${path}`);
        return normalize(resolvedPath);
    };

    const getAutocomplete = async (partialPath: string): Promise<AutocompleteResult> => {
        try {
            const lastSpace = partialPath.lastIndexOf(' ');
            const path = partialPath.slice(lastSpace + 1);

            let searchDir: string;
            let searchPattern = '';

            // Handle special cases for path completion
            if (path === '~' || path === '~/') {
                searchDir = homeDirPath;
                searchPattern = '';
            } else if (path.includes('/')) {
                const dirPath = path.split('/').slice(0, -1).join('/');
                searchDir = await resolveSpecialPath(dirPath || '.');
                searchPattern = path.split('/').pop() || '';
            } else {
                searchDir = currentDirectory;
                searchPattern = path;
            }

            const entries = await readDir(searchDir);
            const suggestions = entries
                .filter((entry: DirEntry) => entry.name.startsWith(searchPattern))
                .map((entry: DirEntry) => {
                    const name = entry.name;
                    return entry.name ? `${name}/` : name;
                })
                .sort((a: string, b: string) => {
                    // Directories first, then files
                    const aIsDir = a.endsWith('/');
                    const bIsDir = b.endsWith('/');
                    if (aIsDir && !bIsDir) return -1;
                    if (!aIsDir && bIsDir) return 1;
                    return a.localeCompare(b);
                });

            return {
                suggestions,
                partialPath: path,
            };
        } catch (error) {
            console.error('Autocomplete error:', error);
            return { suggestions: [], partialPath: '' };
        }
    };

    const executeCommand = useCallback(async (command: string) => {
        try {
            setAutocompleteSuggestions([]);

            if (command.startsWith('cd ')) {
                const newDir = command.slice(3).trim();
                try {
                    const resolvedPath = await resolveSpecialPath(newDir);
                    // Verify the directory exists
                    await readDir(resolvedPath);
                    setCurrentDirectory(resolvedPath);
                    setHistory(prev => [...prev, `$ ${command}`]);
                    return '';
                } catch (error) {
                    const errorMsg = `cd: no such directory: ${newDir}`;
                    setHistory(prev => [...prev, `$ ${command}`, errorMsg]);
                    return errorMsg;
                }
            }

            // Execute command in current directory
            const output = await invoke<string>('execute_command', {
                command,
                working_dir: currentDirectory
            });

            setHistory(prev => [...prev, `$ ${command}`, output]);
            return output;
        } catch (error) {
            const errorMessage = `Error: ${error}`;
            setHistory(prev => [...prev, `$ ${command}`, errorMessage]);
            return errorMessage;
        }
    }, [currentDirectory, resolveSpecialPath]);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return {
        history,
        currentDirectory,
        executeCommand,
        clearHistory,
        getAutocomplete,
        autocompleteSuggestions,
        formatDisplayPath
    };
};
