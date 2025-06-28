import React, { useState, useEffect } from 'react';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import FileTree from './FileTree';
import { Button } from './ui/button';
import {
    FolderPlusIcon,
    FilePlusIcon,
    RotateCw,
    CopyMinus,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { handleKeyboardShortcut, ShortcutHandlers } from '@/lib/keyboard-shortcuts';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';


interface FileOpResult {
    success: boolean;
    message: string;
}

export const FileTreeContainer: React.FC = () => {
    const { openFile } = useEditorStore();
    const {
        refreshFolder,
        loadFolder,
        loadFullFolder,
        loadFolderDepth,
        toggleFolder,
        workspacePath,
        tree: nodes
    } = useFileSystem();
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [showNewFileDialog, setShowNewFileDialog] = useState(false);
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [newFileInputActive, setNewFileInputActive] = useState(false);
    const [newFolderInputActive, setNewFolderInputActive] = useState(false);
    const [newItemInputValue, setNewItemInputValue] = useState("");

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const handlers: ShortcutHandlers = {
                onNewFile: () => setShowNewFileDialog(true),
                onNewFolder: () => setShowNewFolderDialog(true),
                onRefresh: handleIndexWorkspace,
            };
            handleKeyboardShortcut(e, handlers);
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleFileClick = async (path: string) => {
        try {
            const content = await readTextFile(path);
            openFile(path, content);
        } catch (err) {
            console.error('Failed to open file:', path, err);
            toast.error('Failed to open file');
        }
    };

    const handleFolderClick = async (path: string) => {
        setSelectedFolder(path);
        await toggleFolder(path);
    };

    const handleOpenFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
            });
            if (selected && typeof selected === 'string') {
                await loadFolder(selected, 1); // Load with initial depth of 1
            }
        } catch (err) {
            console.error('Failed to open folder:', err);
        }
    };

    const handleLoadFullFolder = async () => {
        if (!workspacePath) return;
        try {
            await loadFullFolder(workspacePath);
            toast.success('Full folder structure loaded');
        } catch (err) {
            console.error('Failed to load full folder:', err);
            toast.error('Failed to load full folder structure');
        }
    };

    const handleLoadFolderDepth = async (depth: number) => {
        if (!workspacePath) return;
        try {
            await loadFolderDepth(workspacePath, depth);
            toast.success(`Loaded folder structure with depth ${depth}`);
        } catch (err) {
            console.error('Failed to load folder depth:', err);
            toast.error('Failed to load folder structure');
        }
    };

    const handleLoadFolderDepthForPath = async (path: string, depth: number) => {
        try {
            await loadFolderDepth(path, depth);
            toast.success(`Loaded folder structure with depth ${depth}`);
        } catch (err) {
            console.error('Failed to load folder depth:', err);
            toast.error('Failed to load folder structure');
        }
    };

    const handleLoadFullFolderForPath = async (path: string) => {
        try {
            await loadFullFolder(path);
            toast.success('Full folder structure loaded');
        } catch (err) {
            console.error('Failed to load full folder:', err);
            toast.error('Failed to load full folder structure');
        }
    };

    const handleIndexWorkspace = async () => {
        if (!workspacePath) {
            console.error("Workspace path is not available.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await invoke<FileOpResult>('index_workspace', { workspacePath });
            if (result.success) {
                await refreshFolder(workspacePath);
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (err) {
            console.error('Failed to index workspace:', err);
            toast.error('Failed to index workspace');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateFile = async (name?: string) => {
        const fileName = name || newItemName;
        if (!fileName) return;
        const parentDir = selectedFolder || workspacePath;
        const filePath = parentDir?.endsWith('/') ? parentDir + fileName : parentDir + '/' + fileName;
        try {
            await writeTextFile(filePath, '');
            await refreshFolder(parentDir as string);
            setShowNewFileDialog(false);
            setNewItemName('');
            openFile(filePath, '');
            toast.success('File created successfully');
        } catch (err) {
            console.error('Failed to create file:', err);
            toast.error('Failed to create file');
        }
    };
    const handleCreateFolder = async (name?: string) => {
        const folderName = name || newItemName;
        if (!folderName) return;
        const parentDir = selectedFolder || workspacePath;
        const folderPath = parentDir?.endsWith('/') ? parentDir + folderName : parentDir + '/' + folderName;
        try {
            const result = await invoke<FileOpResult>('create_dir', { path: folderPath });
            if (result.success) {
                await refreshFolder(parentDir as string);
                setShowNewFolderDialog(false);
                setNewItemName('');
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (err) {
            console.error('Failed to create folder:', err);
            toast.error('Failed to create folder');
        }
    };

    const handleRename = async (oldPath: string, newName: string) => {
        const parentDir = oldPath.split('/').slice(0, -1).join('/');
        const newPath = parentDir + '/' + newName;
        try {
            const result = await invoke<FileOpResult>('rename', { oldPath, newPath });
            if (result.success) {
                await refreshFolder(parentDir);
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (err) {
            console.error('Failed to rename:', err);
            toast.error('Failed to rename item');
        }
    };

    const handleDelete = async (path: string) => {
        try {
            const parentDir = path.split('/').slice(0, -1).join('/');
            const result = await invoke<FileOpResult>('remove', { path });
            if (result.success) {
                await refreshFolder(parentDir);
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (err) {
            console.error('Failed to delete item:', err);
            toast.error('Failed to delete item');
        }
    };

    const handleMove = async (sourcePath: string, targetPath: string) => {
        try {
            const result = await invoke<FileOpResult>('move_item', { source: sourcePath, destination: targetPath });
            if (result.success) {
                refreshFolder(targetPath);
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (err) {
            console.error('Failed to move item:', err);
            toast.error('Failed to move item');
        }
    };

    return (
        <div className="relative flex flex-col h-full bg-background">

            <div className="flex-none flex items-center justify-between p-2 border-b">
                <p className='text-xs uppercase'>
                    Explorer: {workspacePath?.split("/")[workspacePath?.split("/").length - 1] || ' No folder Opened'}
                </p>
                {workspacePath && (
                    <div className="flex items-center gap-1 text-xs">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleLoadFolderDepth(2)}
                            title="Load 2 levels deep"
                        >
                            2L
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleLoadFolderDepth(3)}
                            title="Load 3 levels deep"
                        >
                            3L
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={handleLoadFullFolder}
                            title="Load full folder structure"
                        >
                            All
                        </Button>
                    </div>
                )}
                <div className='flex items-center gap-2'>
                    <FilePlusIcon size={18} onClick={() => { setNewFileInputActive(true); setNewFolderInputActive(false); setNewItemInputValue(""); }} className="cursor-pointer" />
                    <FolderPlusIcon size={18} onClick={() => { setNewFolderInputActive(true); setNewFileInputActive(false); setNewItemInputValue(""); }} className="cursor-pointer" />
                    <RotateCw size={18} onClick={handleIndexWorkspace} className="cursor-pointer" />
                    <CopyMinus size={18} />
                </div>
            </div>

            <div className="p-2 h-screen overflow-auto">
                {newFileInputActive || newFolderInputActive ? (
                    <div className="mb-2 flex items-center gap-2">
                        <input
                            autoFocus
                            className="border rounded px-2 py-1 text-sm w-full"
                            placeholder={newFileInputActive ? "New file name..." : "New folder name..."}
                            value={newItemInputValue}
                            onChange={e => setNewItemInputValue(e.target.value)}
                            onKeyDown={async e => {
                                if (e.key === "Enter" && newItemInputValue.trim()) {
                                    if (newFileInputActive) {
                                        await handleCreateFile(newItemInputValue.trim());
                                    } else if (newFolderInputActive) {
                                        await handleCreateFolder(newItemInputValue.trim());
                                    }
                                    setNewFileInputActive(false);
                                    setNewFolderInputActive(false);
                                    setNewItemInputValue("");
                                } else if (e.key === "Escape") {
                                    setNewFileInputActive(false);
                                    setNewFolderInputActive(false);
                                    setNewItemInputValue("");
                                }
                            }}
                        />
                    </div>
                ) : null}
                {!workspacePath ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Button
                            variant="outline"
                            className="px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                            onClick={handleOpenFolder}
                        >
                            Open a Folder
                        </Button>
                        <p className="text-sm text-muted-foreground mt-4">
                            Lets gets started with bitshift.
                        </p>
                    </div>
                ) : (
                    <FileTree
                        nodes={nodes}
                        onFileClick={handleFileClick}
                        onFolderClick={handleFolderClick}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onMove={handleMove}
                        onLoadDepth={handleLoadFolderDepthForPath}
                        onLoadFull={handleLoadFullFolderForPath}
                    />
                )}
            </div>


        </div>
    );
};
