import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useEditorStore } from '@/store/editorStore';
import EditorView from './EditorView';
import { Button } from './ui/button';
import {
    Maximize2,
    SplitSquareHorizontal,
    SplitSquareVertical,
    Terminal as TerminalIcon,
    Plus,
    Trash2,
    ChevronDown,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TerminalComponent from './Terminal';
import { useCommandRegistry } from '@/commands/registry';
import { useTerminal } from '@/hooks/useTerminal';

interface TerminalInstance {
    id: string;
}

export const EditorLayout: React.FC = () => {
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
    const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
    const [terminalPanels, setTerminalPanels] = useState<{
        direction: 'horizontal' | 'vertical';
        panels: string[][];
    }>({
        direction: 'horizontal',
        panels: [[]]
    });
    const {
        layout,
        closeTab,
        setActiveTab,
        splitPane,
        closePane,
        updateContent,
        closeAllTabs,
        closeAllPanes,
        closeTabsInPane
    } = useEditorStore();
    const registerCommand = useCommandRegistry(state => state.registerCommand);
    const unregisterCommand = useCommandRegistry(state => state.unregisterCommand);
    const { closeTerminal } = useTerminal();

    const createTerminal = () => {
        const id = `terminal-${Date.now()}`;
        setTerminals(prev => [...prev, { id }]);

        // Add to first available panel
        setTerminalPanels(prev => ({
            ...prev,
            panels: prev.panels.length === 0
                ? [[id]]
                : prev.panels.map((panel, i) =>
                    i === 0 ? [...panel, id] : panel
                )
        }));

        setIsTerminalVisible(true);
    };

    // Close a specific terminal
    const handleTerminalClose = async (id: string) => {
        try {
            await closeTerminal(id);
            setTerminals(prev => prev.filter(t => t.id !== id));
            setTerminalPanels(prev => ({
                ...prev,
                panels: prev.panels
                    .map(panel => panel.filter(tid => tid !== id))
                    .filter(panel => panel.length > 0)
            }));

            // Hide terminal panel if no terminals left
            if (terminals.length <= 1) {
                setIsTerminalVisible(false);
            }
        } catch (err) {
            console.error('Failed to close terminal:', err);
        }
    };

    // Split terminal panel
    const splitTerminal = (direction: 'horizontal' | 'vertical') => {
        const id = `terminal-${Date.now()}`;
        setTerminals(prev => [...prev, { id }]);

        setTerminalPanels(prev => {
            if (direction === prev.direction) {
                // Add to new panel in same direction
                return {
                    ...prev,
                    panels: [...prev.panels, [id]]
                };
            } else {
                // Change direction and create new panel
                return {
                    direction,
                    panels: [[...prev.panels.flat()], [id]]
                };
            }
        });

        setIsTerminalVisible(true);
    };

    useEffect(() => {
        // Register terminal commands
        registerCommand('workbench.action.togglePanel', () => {
            if (!isTerminalVisible) {
                if (terminals.length === 0) {
                    createTerminal();
                }
                setIsTerminalVisible(true);
            } else {
                setIsTerminalVisible(false);
            }
        });
        registerCommand('workbench.action.terminal.toggleTerminal', () => {
            if (!isTerminalVisible) {
                if (terminals.length === 0) {
                    createTerminal();
                }
                setIsTerminalVisible(true);
            } else {
                setIsTerminalVisible(false);
            }
        });
        registerCommand('workbench.action.terminal.split', () => splitTerminal('horizontal'));
        registerCommand('workbench.action.terminal.splitVertical', () => splitTerminal('vertical'));
        registerCommand('workbench.action.terminal.new', createTerminal);
        registerCommand('workbench.action.terminal.kill', () => {
            if (terminals.length > 0) {
                handleTerminalClose(terminals[terminals.length - 1].id);
            }
        });

        // Register split editor commands
        registerCommand('workbench.action.splitEditor', (paneId: string) => splitPane(paneId, 'vertical'));
        registerCommand('workbench.action.splitEditorDown', (paneId: string) => splitPane(paneId, 'horizontal'));

        // Register window/editor closing commands
        registerCommand('workbench.action.closeActiveEditor', (paneId: string, tabId: string) => {
            closeTab(paneId, tabId);
        });
        registerCommand('workbench.action.closeAllEditors', () => {
            closeAllTabs();
        });
        registerCommand('workbench.action.closeAllGroups', () => {
            closeAllPanes();
        });
        registerCommand('workbench.action.closeEditorsInGroup', (paneId: string) => {
            closeTabsInPane(paneId);
        });
        registerCommand('workbench.action.closeGroup', (paneId: string) => {
            if (layout.panes.length > 1) {
                closePane(paneId);
            }
        });

        // Cleanup on unmount
        return () => {
            unregisterCommand('workbench.action.terminal.toggleTerminal');
            unregisterCommand('workbench.action.terminal.split');
            unregisterCommand('workbench.action.terminal.splitVertical');
            unregisterCommand('workbench.action.terminal.new');
            unregisterCommand('workbench.action.terminal.kill');
            unregisterCommand('workbench.action.splitEditor');
            unregisterCommand('workbench.action.splitEditorDown');
            unregisterCommand('workbench.action.closeActiveEditor');
            unregisterCommand('workbench.action.closeAllEditors');
            unregisterCommand('workbench.action.closeAllGroups');
            unregisterCommand('workbench.action.closeEditorsInGroup');
            unregisterCommand('workbench.action.closeGroup');
        };
    }, [registerCommand, unregisterCommand, terminals.length, isTerminalVisible, splitPane, closePane, closeTab, closeAllTabs, closeAllPanes, closeTabsInPane, layout.panes.length]);

    const toggleTerminal = () => setIsTerminalVisible(prev => !prev);

    const renderTabs = (paneId: string, tabs: any[], activeTabId: string | null) => (
        <div className="flex items-center h-10 gap-1 px-2 border-b border-border overflow-x-auto scrollbar-none bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    className={cn(
                        "group flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer",
                        "hover:bg-accent/50 transition-colors duration-150",
                        activeTabId === tab.id && "dark:bg-gray-800 rounded-none text-accent-foreground font-medium border-b-2 border-teal-400"
                    )}
                    onClick={() => setActiveTab(paneId, tab.id)}
                >
                    <span className="truncate max-w-[120px]">
                        {tab.filePath.split('/').pop()}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            closeTab(paneId, tab.id);
                        }}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            ))}
            <div className="ml-auto flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={toggleTerminal}
                >
                    <TerminalIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => splitPane(paneId, 'vertical')}
                >
                    <SplitSquareVertical className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => splitPane(paneId, 'horizontal')}
                >
                    <SplitSquareHorizontal className="h-4 w-4" />
                </Button>
                {layout.panes.length > 1 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => closePane(paneId)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );

    const renderPane = (pane: any) => (
        <div key={pane.id} className="h-full flex flex-col">
            {renderTabs(pane.id, pane.tabs, pane.activeTabId)}
            <div className="flex-1 min-h-0">
                {pane.activeTabId ? (
                    <EditorView
                        key={pane.activeTabId}
                        filePath={pane.tabs.find((t: any) => t.id === pane.activeTabId)?.filePath || ''}
                        content={pane.tabs.find((t: any) => t.id === pane.activeTabId)?.content || ''}
                        onChange={(content) => updateContent(pane.id, pane.activeTabId, content)}
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                        <Maximize2 className="h-12 w-12" />
                        <p className="text-sm">Open a file or split this pane</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <PanelGroup direction="vertical">
            {/* Editor Panels */}
            <Panel id="editor" defaultSize={isTerminalVisible ? 70 : 100}>
                <PanelGroup direction="horizontal">
                    {layout.panes.map((pane, index) => (
                        <React.Fragment key={pane.id}>
                            {index > 0 && (
                                <PanelResizeHandle className="w-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
                            )}
                            <Panel
                                id={`editor-pane-${pane.id}`}
                                defaultSize={layout.sizes[index]}
                                className="h-full"
                            >
                                {renderPane(pane)}
                            </Panel>
                        </React.Fragment>
                    ))}
                </PanelGroup>
            </Panel>

            {/* Terminal Panel */}
            {isTerminalVisible && (
                <>
                    <PanelResizeHandle className="h-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
                    <Panel id="terminal" defaultSize={30} minSize={10}>
                        <div className="flex h-full flex-col bg-background">
                            {/* Terminal Controls */}
                            <div className="flex items-center justify-between border-b border-border/40 px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => createTerminal()}
                                        title="New Terminal"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => splitTerminal('horizontal')}
                                        title="Split Terminal Horizontally"
                                    >
                                        <SplitSquareHorizontal className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => splitTerminal('vertical')}
                                        title="Split Terminal Vertically"
                                    >
                                        <SplitSquareVertical className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                        onClick={() => terminals.forEach(t => handleTerminalClose(t.id))}
                                        title="Kill All Terminals"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setIsTerminalVisible(false)}
                                        title="Hide Terminal Panel"
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Terminal Content */}
                            <div className="flex-1 p-2">
                                <PanelGroup direction={terminalPanels.direction}>
                                    {terminalPanels.panels.map((panel, panelIndex) => (
                                        <React.Fragment key={panelIndex}>
                                            {panelIndex > 0 && (
                                                <PanelResizeHandle className={cn(
                                                    terminalPanels.direction === 'horizontal'
                                                        ? "w-1.5 bg-border/40 hover:bg-border/60"
                                                        : "h-1.5 bg-border/40 hover:bg-border/60",
                                                    "transition-colors"
                                                )} />
                                            )}
                                            <Panel>
                                                <PanelGroup direction={terminalPanels.direction === 'horizontal' ? 'vertical' : 'horizontal'}>
                                                    {panel.map((terminalId, terminalIndex) => (
                                                        <React.Fragment key={terminalId}>
                                                            {terminalIndex > 0 && (
                                                                <PanelResizeHandle className={cn(
                                                                    terminalPanels.direction === 'horizontal'
                                                                        ? "h-1.5 bg-border/40 hover:bg-border/60"
                                                                        : "w-1.5 bg-border/40 hover:bg-border/60",
                                                                    "transition-colors"
                                                                )} />
                                                            )}
                                                            <Panel>
                                                                <TerminalComponent
                                                                    key={terminalId}
                                                                    id={terminalId}
                                                                    onClose={() => setIsTerminalVisible(false)}
                                                                    onDelete={() => handleTerminalClose(terminalId)}
                                                                    isFocusedTerminal={terminals.length === 1}
                                                                />
                                                            </Panel>
                                                        </React.Fragment>
                                                    ))}
                                                </PanelGroup>
                                            </Panel>
                                        </React.Fragment>
                                    ))}
                                </PanelGroup>
                            </div>
                        </div>
                    </Panel>
                </>
            )}
        </PanelGroup>
    );
};
