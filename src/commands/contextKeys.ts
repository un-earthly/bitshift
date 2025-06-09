import { create } from 'zustand';

interface ContextState {
    contexts: Map<string, boolean>;
    setContext: (key: string, value: boolean) => void;
    getContext: (key: string) => boolean;
    evaluateWhen: (when: string) => boolean;
}

export const useContextKeys = create<ContextState>((set, get) => ({
    contexts: new Map(),

    setContext: (key, value) => {
        set(state => {
            const contexts = new Map(state.contexts);
            contexts.set(key, value);
            return { contexts };
        });
    },

    getContext: (key) => {
        return get().contexts.get(key) ?? false;
    },

    evaluateWhen: (when) => {
        if (!when) return true;

        // Split by && and evaluate each condition
        const conditions = when.split('&&').map(c => c.trim());
        return conditions.every(condition => {
            const negated = condition.startsWith('!');
            const key = negated ? condition.slice(1) : condition;
            const value = get().getContext(key);
            return negated ? !value : value;
        });
    }
})); 