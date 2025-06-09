import { useCommandRegistry } from './registry';
import { useContextKeys } from './contextKeys';

export interface Keybinding {
    key: string;
    command: string;
    when?: string;
    args?: any[];
}

let currentChord: string | null = null;
let chordTimeout: NodeJS.Timeout | null = null;

function buildKeyString(event: KeyboardEvent): string {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    if (event.metaKey) modifiers.push('cmd');

    const key = event.key.toLowerCase();
    if (key === ' ') return [...modifiers, 'space'].join('+');
    if (key.length === 1) return [...modifiers, key].join('+');
    return [...modifiers, key].join('+');
}

export class KeybindingService {
    private keybindings: Map<string, Keybinding[]> = new Map();
    private chordKeybindings: Map<string, Keybinding[]> = new Map();

    constructor() {
        window.addEventListener('keydown', this.handleKeyDown);
    }

    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    registerKeybinding(keybinding: Keybinding) {
        const keys = keybinding.key.split(' ');
        if (keys.length === 1) {
            const bindings = this.keybindings.get(keys[0]) || [];
            bindings.push(keybinding);
            this.keybindings.set(keys[0], bindings);
        } else if (keys.length === 2) {
            const bindings = this.chordKeybindings.get(keys[0]) || [];
            bindings.push({ ...keybinding, key: keys[1] });
            this.chordKeybindings.set(keys[0], bindings);
        }
    }

    private handleKeyDown = async (event: KeyboardEvent) => {
        const keyString = buildKeyString(event);
        const evaluateWhen = useContextKeys.getState().evaluateWhen;
        const executeCommand = useCommandRegistry.getState().executeCommand;

        // If we're in a chord sequence
        if (currentChord) {
            event.preventDefault();
            const chordBindings = this.chordKeybindings.get(currentChord) || [];
            const matchingBinding = chordBindings.find(binding =>
                binding.key === keyString && evaluateWhen(binding.when || '')
            );

            if (matchingBinding) {
                await executeCommand(matchingBinding.command, ...(matchingBinding.args || []));
            }

            currentChord = null;
            if (chordTimeout) clearTimeout(chordTimeout);
            return;
        }

        // Check for chord start
        if (this.chordKeybindings.has(keyString)) {
            event.preventDefault();
            currentChord = keyString;
            if (chordTimeout) clearTimeout(chordTimeout);
            chordTimeout = setTimeout(() => {
                currentChord = null;
            }, 1000);
            return;
        }

        // Regular keybinding
        const bindings = this.keybindings.get(keyString) || [];
        const matchingBinding = bindings.find(binding =>
            evaluateWhen(binding.when || '')
        );

        if (matchingBinding) {
            event.preventDefault();
            await executeCommand(matchingBinding.command, ...(matchingBinding.args || []));
        }
    };
}

export const keybindingService = new KeybindingService(); 