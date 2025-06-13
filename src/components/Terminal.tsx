// TerminalComp.tsx
import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { event } from '@tauri-apps/api';
import { useContextKeys } from '@/commands/contextKeys';
import { useTerminal } from '@/hooks/useTerminal';
import { X } from 'lucide-react';
import 'xterm/css/xterm.css';

interface PtyOutput {
    data: string;
    id: string;
}

interface TerminalProps {
    id: string;
    onClose: () => void;
    onDelete: () => void;
    isFocusedTerminal?: boolean;
}

function TerminalComp({ id, onClose, onDelete, isFocusedTerminal = false }: TerminalProps) {
    const [error, setError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isPtyReady, setIsPtyReady] = useState(false);
    const { setContext } = useContextKeys();
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal>();
    const fitAddon = useRef<FitAddon>();
    const isInitialized = useRef(false);
    const { startTerminal, writeToTerminal, closeTerminal, resizeTerminal } = useTerminal({
        onError: setError,
    });

    const fitTerminal = () => {
        if (fitAddon.current && term.current && isPtyReady) {
            try {
                fitAddon.current.fit();
                const { rows, cols } = term.current;
                term.current.resize(cols, rows);
                console.log(`[TerminalComp] Fitting terminal ${id} to rows: ${rows}, cols: ${cols}`);
                resizeTerminal(id, rows, cols).catch((err) => {
                    console.error('Failed to resize PTY:', err);
                    setError('Failed to resize terminal');
                });
            } catch (err) {
                console.error('Failed to fit terminal:', err);
                setError('Failed to fit terminal');
            }
        }
    };

    useEffect(() => {
        let isTerminalActive = true;

        const initializeTerminal = async () => {
            try {
                if (isInitialized.current) {
                    console.log(`[TerminalComp] Terminal ${id} already initialized, skipping`);
                    return;
                }
                isInitialized.current = true;

                term.current = new Terminal({
                    fontFamily: 'monospace',
                    fontSize: 14,
                    theme: { background: '#1a1b26' },
                    allowProposedApi: true,
                    cursorBlink: true,
                });

                fitAddon.current = new FitAddon();
                term.current.loadAddon(fitAddon.current);

                if (!terminalRef.current || !isTerminalActive) return;

                term.current.open(terminalRef.current);

                const handleFocus = () => {
                    setIsFocused(true);
                    setContext('terminalFocused', true);
                };

                const handleBlur = () => {
                    setIsFocused(false);
                    setContext('terminalFocused', false);
                };

                term.current.element?.addEventListener('focus', handleFocus);
                term.current.element?.addEventListener('blur', handleBlur);

                const preventBubbling = (e: KeyboardEvent) => {
                    if (isFocused) {
                        e.stopPropagation();
                    }
                };

                terminalRef.current.addEventListener('keydown', preventBubbling, true);
                terminalRef.current.addEventListener('keyup', preventBubbling, true);

                term.current.onData((data) => {
                    if (isTerminalActive) {
                        console.log(`[TerminalComp] User input for terminal ${id}:`, data);
                        writeToTerminal(id, data).catch((err) => {
                            console.error('Failed to write to PTY:', err);
                            setError('Failed to send command to terminal');
                        });
                    }
                });

                await startTerminal(id);
                if (!isTerminalActive) return;

                const unsubscribePtyReady = await event.listen<string>('pty_ready', (event) => {
                    if (isTerminalActive && event.payload === id) {
                        console.log(`[TerminalComp] Received pty_ready for terminal ${id}`);
                        setIsPtyReady(true);
                        fitTerminal();
                        writeToTerminal(id, 'clear\n').catch((err) => {
                            console.error('Failed to write to PTY:', err);
                            setError('Failed to send command to terminal');
                        });
                    }
                });

                const unsubscribePtyOutput = await event.listen<PtyOutput>('pty_output', (event) => {
                    if (isTerminalActive && term.current && event.payload.id === id) {
                        console.log(`[TerminalComp] Received pty_output for terminal ${id}:`, event.payload.data);
                        term.current.write(event.payload.data);
                    }
                });

                const resizeObserver = new ResizeObserver(() => {
                    if (isTerminalActive && isPtyReady) {
                        fitTerminal();
                    }
                });
                resizeObserver.observe(terminalRef.current);

                const handleResize = () => {
                    if (isTerminalActive && isPtyReady) {
                        fitTerminal();
                    }
                };
                window.addEventListener('resize', handleResize);

                return () => {
                    isTerminalActive = false;
                    isInitialized.current = false;
                    unsubscribePtyReady();
                    unsubscribePtyOutput();
                    if (term.current?.element) {
                        term.current.element.removeEventListener('focus', handleFocus);
                        term.current.element.removeEventListener('blur', handleBlur);
                    }
                    term.current?.dispose();
                    terminalRef.current?.removeEventListener('keydown', preventBubbling, true);
                    terminalRef.current?.removeEventListener('keyup', preventBubbling, true);
                    resizeObserver.disconnect();
                    window.removeEventListener('resize', handleResize);

                    closeTerminal(id)
                        .catch((err) => {
                            if (!err.toString().includes('No PTY session found')) {
                                console.error('Failed to close PTY:', err);
                            }
                        })
                        .finally(() => {
                            onClose?.();
                        });
                };
            } catch (err) {
                console.error('Failed to initialize terminal:', err);
                setError('Failed to initialize terminal');
                isInitialized.current = false;
            }
        };

        initializeTerminal();
    }, [id, startTerminal, writeToTerminal, closeTerminal, setContext, onClose]);

    useEffect(() => {
        if (isFocusedTerminal && term.current?.element) {
            term.current.focus();
        }
    }, [isFocusedTerminal]);

    return (
        <div className="flex h-full flex-col overflow-hidden relative group">
            {error && (
                <div className="absolute top-0 left-0 right-0 z-50 bg-destructive p-2 text-center text-destructive-foreground">
                    {error}
                    <button
                        className="ml-2 underline hover:opacity-80"
                        onClick={() => setError(null)}
                    >
                        Dismiss
                    </button>
                </div>
            )}
            {/* Terminal Controls (visible on hover) */}
            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-bl border-l border-b border-border/40 z-10">
                <button
                    className="p-1 hover:bg-border/40 rounded"
                    onClick={onDelete}
                    title="Delete Terminal"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
            <div
                ref={terminalRef}
                className="flex-1 min-h-[300px] rounded-md border border-border/40 bg-background"
                data-terminal-focused={isFocused}
            />
        </div>
    );
}

export default TerminalComp;