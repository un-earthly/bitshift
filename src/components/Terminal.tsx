import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useTerminal } from '@/hooks/useTerminal';
import { cn } from '@/lib/utils';
import 'xterm/css/xterm.css';

interface TerminalProps {
    className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ className }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);

    const { executeCommand, currentDirectory, getAutocomplete } = useTerminal();

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm.js
        const xterm = new XTerm({
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#d4d4d4',
                cursorAccent: '#1e1e1e',
                selectionBackground: '#264f78',
                black: '#1e1e1e',
                brightBlack: '#666666',
                red: '#f14c4c',
                brightRed: '#f14c4c',
                green: '#23d18b',
                brightGreen: '#23d18b',
                yellow: '#f5f543',
                brightYellow: '#f5f543',
                blue: '#3b8eea',
                brightBlue: '#3b8eea',
                magenta: '#d670d6',
                brightMagenta: '#d670d6',
                cyan: '#29b8db',
                brightCyan: '#29b8db',
                white: '#d4d4d4',
                brightWhite: '#d4d4d4'
            },
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 14,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: 'block',
            allowTransparency: true,
            scrollback: 10000,
        });

        // Add the fit addon
        const fitAddon = new FitAddon();
        xterm.loadAddon(fitAddon);

        // Add the web links addon
        const webLinksAddon = new WebLinksAddon();
        xterm.loadAddon(webLinksAddon);

        // Open the terminal in the container
        xterm.open(terminalRef.current);
        fitAddon.fit();

        // Store the terminal instance
        xtermRef.current = xterm;

        // Initialize with prompt
        xterm.write(`\r\n$ ${currentDirectory}> `);

        let currentLine = '';
        let commandHistory: string[] = [];
        let historyIndex = -1;        // Handle terminal input
        xterm.onData((data) => {
            const code = data.charCodeAt(0);

            // Handle Tab key for autocompletion
            if (code === 9) {
                getAutocomplete(currentLine).then(({ suggestions, partialPath }) => {
                    if (suggestions.length === 1) {
                        // Clear current partial path
                        const chars = partialPath.length;
                        for (let i = 0; i < chars; i++) {
                            xterm.write('\b \b');
                        }
                        // Write the completed path
                        const completion = suggestions[0];
                        xterm.write(completion);
                        currentLine = currentLine.slice(0, -partialPath.length) + completion;
                    } else if (suggestions.length > 1) {
                        xterm.write('\r\n');
                        // Show all suggestions in a formatted grid
                        const maxLength = Math.max(...suggestions.map(s => s.length));
                        const terminalWidth = xterm.cols;
                        const itemsPerRow = Math.floor(terminalWidth / (maxLength + 2));

                        for (let i = 0; i < suggestions.length; i += itemsPerRow) {
                            const row = suggestions.slice(i, i + itemsPerRow)
                                .map(s => s.padEnd(maxLength + 2))
                                .join('');
                            xterm.write(row + '\r\n');
                        }

                        // Rewrite prompt and current command
                        xterm.write(`$ ${currentDirectory}> ${currentLine}`);
                    }
                });
                return;
            }

            // Handle Enter key
            if (code === 13) {
                if (currentLine.trim()) {
                    commandHistory.push(currentLine);
                    historyIndex = commandHistory.length;

                    xterm.write('\r\n');
                    executeCommand(currentLine).then(output => {
                        xterm.write(output);
                        xterm.write(`\r\n$ ${currentDirectory}> `);
                    });

                    currentLine = '';
                }
            }
            // Handle Backspace
            else if (code === 127) {
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    xterm.write('\b \b');
                }
            }
            // Handle arrow keys and other special keys
            else if (code === 27) {
                // Handle up arrow (history)
                if (data === '\u001b[A' && historyIndex > 0) {
                    // Clear current line
                    while (currentLine.length > 0) {
                        xterm.write('\b \b');
                        currentLine = currentLine.slice(0, -1);
                    }
                    historyIndex--;
                    currentLine = commandHistory[historyIndex];
                    xterm.write(currentLine);
                }
                // Handle down arrow (history)
                else if (data === '\u001b[B' && historyIndex < commandHistory.length) {
                    // Clear current line
                    while (currentLine.length > 0) {
                        xterm.write('\b \b');
                        currentLine = currentLine.slice(0, -1);
                    }
                    historyIndex++;
                    if (historyIndex < commandHistory.length) {
                        currentLine = commandHistory[historyIndex];
                        xterm.write(currentLine);
                    }
                }
            }
            // Regular character input
            else if (code >= 32) {
                currentLine += data;
                xterm.write(data);
            }
        });

        // Handle window resize
        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
        });
        resizeObserver.observe(terminalRef.current);

        return () => {
            resizeObserver.disconnect();
            xterm.dispose();
        };
    }, []);

    return (
        <div className={cn("h-full w-full bg-[#1e1e1e]", className)} ref={terminalRef} />
    );
};
