import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { event } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/core';
import 'xterm/css/xterm.css';

interface PtyOutput {
    data: string;
}

function TerminalComp() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Initialize terminal
    useEffect(() => {
        if (!terminalRef.current) return;

        term.current = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
                cursor: '#ffffff'
            },
            convertEol: true,
            scrollback: 5000,
            allowTransparency: true,
        });

        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        
        term.current.open(terminalRef.current);
        
        // Delay the fit operation to ensure the terminal is properly mounted
        setTimeout(() => {
            fitAddon.current?.fit();
        }, 0);

        // Start PTY process
        invoke('start_pty')
            .then(() => {
                // Execute clear command after PTY starts
                return invoke('write_to_pty', { data: 'clear\n' });
            })
            .catch((err) => {
                console.error('Failed to start PTY:', err);
                setError('Failed to start terminal process');
            });

        // Handle user input including special keys
        term.current.onData((data) => {
            // Handle special keys if needed
            invoke('write_to_pty', { data })
                .catch((err) => {
                    console.error('Failed to write to PTY:', err);
                    setError('Failed to send command to terminal');
                });
        });

        // Handle PTY output
        const unsubscribe = event.listen<PtyOutput>('pty_output', (event) => {
            if (term.current) {
                term.current.write(event.payload.data);
            }
        });

        // Cleanup
        return () => {
            unsubscribe.then(f => f());
            term.current?.dispose();
        };
    }, []);

    // Handle window and container resizing
    useLayoutEffect(() => {
        if (!fitAddon.current) return;

        const handleResize = () => {
            try {
                fitAddon.current?.fit();
            } catch (err) {
                console.error('Failed to resize terminal:', err);
            }
        };

        // Initial fit
        handleResize();

        // Add resize listeners
        window.addEventListener('resize', handleResize);
        const resizeObserver = new ResizeObserver(handleResize);
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div className="terminal-container relative flex h-full w-full flex-col bg-[#1e1e1e]">
            {error && (
                <div className="absolute top-0 left-0 right-0 z-50 bg-red-500 p-2 text-center text-white">
                    {error}
                    <button
                        className="ml-2 underline"
                        onClick={() => setError(null)}
                    >
                        Dismiss
                    </button>
                </div>
            )}
            <div
                ref={terminalRef}
                className="flex-1 overflow-hidden"
                style={{ padding: '4px' }}
            />
        </div>
    );
}

export default TerminalComp;