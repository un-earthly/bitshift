import { create } from 'zustand';

export interface EditorTab {
    id: string;
    filePath: string;
    content: string;
}

interface EditorPane {
    id: string;
    tabs: EditorTab[];
    activeTabId: string | null;
}

interface EditorLayout {
    direction: 'horizontal' | 'vertical';
    panes: EditorPane[];
    sizes: number[];
}

interface EditorStore {
    layout: EditorLayout;
    activePane: string | null;
    openFile: (filePath: string, content: string) => void;
    setActiveTab: (paneId: string, tabId: string) => void;
    closeTab: (paneId: string, tabId: string) => void;
    closeAllTabs: () => void;
    closeTabsInPane: (paneId: string) => void;
    closePane: (paneId: string) => void;
    closeAllPanes: () => void;
    splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
    updateContent: (paneId: string, tabId: string, content: string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
    layout: {
        direction: 'horizontal',
        panes: [{
            id: 'default',
            tabs: [],
            activeTabId: null
        }],
        sizes: [100]
    },
    activePane: 'default',

    openFile: (filePath, content) => set(state => {
        const paneId = state.activePane || 'default';
        const pane = state.layout.panes.find(p => p.id === paneId);

        if (!pane) return state;

        // Check if file is already open in this pane
        const existingTab = pane.tabs.find(t => t.filePath === filePath);
        if (existingTab) {
            return {
                layout: {
                    ...state.layout,
                    panes: state.layout.panes.map(p =>
                        p.id === paneId
                            ? { ...p, activeTabId: existingTab.id }
                            : p
                    )
                }
            };
        }

        // Create new tab
        const newTab: EditorTab = {
            id: `${Date.now()}`,
            filePath,
            content
        };

        return {
            layout: {
                ...state.layout,
                panes: state.layout.panes.map(p =>
                    p.id === paneId
                        ? {
                            ...p,
                            tabs: [...p.tabs, newTab],
                            activeTabId: newTab.id
                        }
                        : p
                )
            }
        };
    }),

    setActiveTab: (paneId, tabId) => set(state => ({
        layout: {
            ...state.layout,
            panes: state.layout.panes.map(pane =>
                pane.id === paneId
                    ? { ...pane, activeTabId: tabId }
                    : pane
            )
        },
        activePane: paneId
    })),

    closeTab: (paneId, tabId) => set(state => {
        const pane = state.layout.panes.find(p => p.id === paneId);
        if (!pane) return state;

        const tabIndex = pane.tabs.findIndex(t => t.id === tabId);
        const remainingTabs = pane.tabs.filter(tab => tab.id !== tabId);

        // Determine the new active tab
        let newActiveTabId = null;
        if (pane.activeTabId === tabId) {
            // If we're closing the active tab, try to activate the previous tab,
            // if not available, try the next tab, if not available, null
            if (tabIndex > 0) {
                newActiveTabId = remainingTabs[tabIndex - 1].id;
            } else if (remainingTabs.length > 0) {
                newActiveTabId = remainingTabs[0].id;
            }
        } else {
            // If we're not closing the active tab, keep the current active tab
            newActiveTabId = pane.activeTabId;
        }

        return {
            layout: {
                ...state.layout,
                panes: state.layout.panes.map(p =>
                    p.id === paneId
                        ? {
                            ...p,
                            tabs: remainingTabs,
                            activeTabId: newActiveTabId
                        }
                        : p
                )
            }
        };
    }),

    closeAllTabs: () => set(state => ({
        layout: {
            ...state.layout,
            panes: state.layout.panes.map(pane => ({
                ...pane,
                tabs: [],
                activeTabId: null
            }))
        }
    })),

    closeTabsInPane: (paneId) => set(state => ({
        layout: {
            ...state.layout,
            panes: state.layout.panes.map(pane =>
                pane.id === paneId
                    ? { ...pane, tabs: [], activeTabId: null }
                    : pane
            )
        }
    })),

    closePane: (paneId) => set(state => {
        const paneIndex = state.layout.panes.findIndex(p => p.id === paneId);
        if (paneIndex === -1 || state.layout.panes.length <= 1) return state;

        const newSizes = [...state.layout.sizes];
        const removedSize = newSizes.splice(paneIndex, 1)[0];

        // Distribute the removed pane's size among remaining panes
        const sizePerPane = removedSize / newSizes.length;
        newSizes.forEach((_, i) => newSizes[i] += sizePerPane);

        const remainingPanes = state.layout.panes.filter(p => p.id !== paneId);
        const newActivePane = remainingPanes[Math.max(0, paneIndex - 1)].id;

        return {
            layout: {
                ...state.layout,
                panes: remainingPanes,
                sizes: newSizes
            },
            activePane: newActivePane
        };
    }),

    closeAllPanes: () => set(() => ({
        layout: {
            direction: 'horizontal',
            panes: [{
                id: 'default',
                tabs: [],
                activeTabId: null
            }],
            sizes: [100]
        },
        activePane: 'default'
    })),

    splitPane: (paneId, direction) => set(state => {
        const paneIndex = state.layout.panes.findIndex(p => p.id === paneId);
        if (paneIndex === -1) return state;

        const newPaneId = `pane-${Date.now()}`;
        const newPane: EditorPane = {
            id: newPaneId,
            tabs: [],
            activeTabId: null
        };

        const newPanes = [...state.layout.panes];
        newPanes.splice(paneIndex + 1, 0, newPane);

        const newSizes = [...state.layout.sizes];
        const splitSize = newSizes[paneIndex] / 2;
        newSizes[paneIndex] = splitSize;
        newSizes.splice(paneIndex + 1, 0, splitSize);

        return {
            layout: {
                ...state.layout,
                direction: direction,
                panes: newPanes,
                sizes: newSizes
            },
            activePane: newPaneId
        };
    }),

    updateContent: (paneId, tabId, content) => set(state => ({
        layout: {
            ...state.layout,
            panes: state.layout.panes.map(pane =>
                pane.id === paneId
                    ? {
                        ...pane,
                        tabs: pane.tabs.map(tab =>
                            tab.id === tabId
                                ? { ...tab, content }
                                : tab
                        )
                    }
                    : pane
            )
        }
    }))
}));
