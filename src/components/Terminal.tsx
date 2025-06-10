import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { event } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/core';

function TerminalComp() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal | null>(null);

    useEffect(() => {
        term.current = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            theme: { background: '#1e1e1e', foreground: '#ffffff' },
            convertEol: true,
        });
        const fitAddon = new FitAddon();
        term.current.loadAddon(fitAddon);

        if (terminalRef.current) {
            term.current.open(terminalRef.current);
            fitAddon.fit();
        }

        invoke('start_pty', {}).catch((err) => console.error('Failed to start PTY:', err));

        term.current.onData((data) => {
            invoke('write_to_pty', { data }).catch((err) => console.error('Failed to write to PTY:', err));
        });

        const unsubscribe = event.listen('pty_output', (event: any) => {
            console.log('PTY Output:', JSON.stringify(event.payload.data));
            term.current?.write(event.payload.data);
        });

        // Handle window resize
        const handleResize = () => {
            fitAddon.fit();
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            unsubscribe.then((unsub) => unsub());
            term.current?.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="container">
            <h1>Interactive Terminal</h1>
            <div ref={terminalRef} style={{ width: '100%', height: '400px' }} />
        </div>
    );
}

export default TerminalComp;