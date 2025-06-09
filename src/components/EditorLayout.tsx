import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useEditorStore } from '@/store/editorStore';
import EditorView from './EditorView';

import { Button } from './ui/button';
import { X, Maximize2, SplitSquareHorizontal, SplitSquareVertical, Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import TerminalComponent from './Terminal';
import { useCommandRegistry } from '@/commands/registry';

export const EditorLayout: React.FC = () => {
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
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

    useEffect(() => {
        // Register panel/terminal commands
        registerCommand('workbench.action.terminal.toggleTerminal', () => setIsTerminalVisible(prev => !prev));
        registerCommand('workbench.action.togglePanel', () => setIsTerminalVisible(prev => !prev));

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
            unregisterCommand('workbench.action.togglePanel');
            unregisterCommand('workbench.action.terminal.toggleTerminal');
            unregisterCommand('workbench.action.splitEditor');
            unregisterCommand('workbench.action.splitEditorDown');
            unregisterCommand('workbench.action.closeActiveEditor');
            unregisterCommand('workbench.action.closeAllEditors');
            unregisterCommand('workbench.action.closeAllGroups');
            unregisterCommand('workbench.action.closeEditorsInGroup');
            unregisterCommand('workbench.action.closeGroup');
        };
    }, [registerCommand, unregisterCommand, splitPane, closePane, closeTab, closeAllTabs, closeAllPanes, closeTabsInPane, layout.panes.length]);

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
        <PanelGroup direction="vertical" autoSaveId="editor-layout">
            <Panel id="editor-main" defaultSize={70} minSize={30}>
                <PanelGroup direction={layout.direction} className="h-full">
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

            {isTerminalVisible && (
                <>
                    <PanelResizeHandle className="h-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
                    <Panel
                        id="terminal"
                        defaultSize={30}
                        minSize={10}
                        maxSize={70}
                        order={2}
                    >
                        <TerminalComponent />
                    </Panel>
                </>
            )}
        </PanelGroup>
    );
};
