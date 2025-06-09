import { create } from 'zustand';

export interface Command {
    id: string;
    handler: (...args: any[]) => void | Promise<void>;
}

interface CommandRegistry {
    commands: Map<string, Command>;
    registerCommand: (id: string, handler: Command['handler']) => void;
    unregisterCommand: (id: string) => void;
    executeCommand: (id: string, ...args: any[]) => Promise<void>;
}

export const useCommandRegistry = create<CommandRegistry>((set, get) => ({
    commands: new Map(),

    registerCommand: (id, handler) => {
        set(state => {
            const commands = new Map(state.commands);
            commands.set(id, { id, handler });
            return { commands };
        });
    },

    unregisterCommand: (id) => {
        set(state => {
            const commands = new Map(state.commands);
            commands.delete(id);
            return { commands };
        });
    },

    executeCommand: async (id, ...args) => {
        const command = get().commands.get(id);
        if (command) {
            await command.handler(...args);
        } else {
            console.warn(`Command not found: ${id}`);
        }
    }
})); 