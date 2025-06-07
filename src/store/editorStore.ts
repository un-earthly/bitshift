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
    sizes: number[];
    panes: EditorPane[];
}

interface EditorStore {
    layout: EditorLayout;
    activePane: string | null;
    openFile: (filePath: string, content: string) => void;
    closeTab: (paneId: string, tabId: string) => void;
    setActiveTab: (paneId: string, tabId: string) => void;
    splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
    closePane: (paneId: string) => void;
    updateContent: (paneId: string, tabId: string, content: string) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
    layout: {
        direction: 'horizontal',
        sizes: [100],
        panes: [{
            id: 'main',
            tabs: [],
            activeTabId: null
        }]
    },
    activePane: 'main',

    openFile: (filePath: string, content: string) => {
        set(state => {
            const activePane = state.activePane || 'main';
            const panes = [...state.layout.panes];
            const paneIndex = panes.findIndex(p => p.id === activePane);

            if (paneIndex === -1) return state;

            const pane = panes[paneIndex];
            const existingTab = pane.tabs.find(t => t.filePath === filePath);

            if (existingTab) {
                pane.activeTabId = existingTab.id;
                return { ...state, layout: { ...state.layout, panes } };
            }

            const newTab: EditorTab = {
                id: `${Date.now()}`,
                filePath,
                content
            };

            pane.tabs.push(newTab);
            pane.activeTabId = newTab.id;

            return { ...state, layout: { ...state.layout, panes } };
        });
    },

    closeTab: (paneId: string, tabId: string) => {
        set(state => {
            const panes = [...state.layout.panes];
            const paneIndex = panes.findIndex(p => p.id === paneId);

            if (paneIndex === -1) return state;

            const pane = panes[paneIndex];
            const tabIndex = pane.tabs.findIndex(t => t.id === tabId);

            if (tabIndex === -1) return state;

            pane.tabs.splice(tabIndex, 1);

            if (pane.activeTabId === tabId) {
                pane.activeTabId = pane.tabs[Math.min(tabIndex, pane.tabs.length - 1)]?.id || null;
            }

            return { ...state, layout: { ...state.layout, panes } };
        });
    },

    setActiveTab: (paneId: string, tabId: string) => {
        set(state => {
            const panes = [...state.layout.panes];
            const paneIndex = panes.findIndex(p => p.id === paneId);

            if (paneIndex === -1) return state;

            panes[paneIndex].activeTabId = tabId;
            return { ...state, layout: { ...state.layout, panes }, activePane: paneId };
        });
    },

    splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => {
        set(state => {
            const panes = [...state.layout.panes];
            const paneIndex = panes.findIndex(p => p.id === paneId);

            if (paneIndex === -1) return state;

            const newPane: EditorPane = {
                id: `pane-${Date.now()}`,
                tabs: [],
                activeTabId: null
            };

            panes.splice(paneIndex + 1, 0, newPane);

            const sizes = state.layout.sizes;
            const newSize = sizes[paneIndex] / 2;
            sizes[paneIndex] = newSize;
            sizes.splice(paneIndex + 1, 0, newSize);

            return {
                ...state,
                layout: {
                    ...state.layout,
                    direction,
                    sizes,
                    panes
                },
                activePane: newPane.id
            };
        });
    },

    closePane: (paneId: string) => {
        set(state => {
            const panes = [...state.layout.panes];
            const paneIndex = panes.findIndex(p => p.id === paneId);

            if (paneIndex === -1 || panes.length === 1) return state;

            panes.splice(paneIndex, 1);
            const sizes = [...state.layout.sizes];
            const removedSize = sizes.splice(paneIndex, 1)[0];

            if (sizes.length > 0) {
                sizes[0] += removedSize;
            }

            return {
                ...state,
                layout: {
                    ...state.layout,
                    sizes,
                    panes
                },
                activePane: panes[Math.max(0, paneIndex - 1)].id
            };
        });
    },

    updateContent: (paneId: string, tabId: string, content: string) => {
        set(state => {
            const panes = [...state.layout.panes];
            const paneIndex = panes.findIndex(p => p.id === paneId);

            if (paneIndex === -1) return state;

            const pane = panes[paneIndex];
            const tab = pane.tabs.find(t => t.id === tabId);

            if (!tab) return state;

            tab.content = content;
            return { ...state, layout: { ...state.layout, panes } };
        });
    }
}));
