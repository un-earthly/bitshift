import React, { useState, useEffect } from 'react';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import FileTree from './FileTree';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import {
    RefreshCw,
    FileIcon,
    FolderIcon,
    ChevronDown,
    Plus,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { handleKeyboardShortcut, ShortcutHandlers } from '@/lib/keyboard-shortcuts';
import { toast } from 'sonner';

interface FileTreeContainerProps {
    nodes: any;
    workspacePath: string;
    onFolderClick: (path: string) => Promise<void>;
}

interface FileOpResult {
    success: boolean;
    message: string;
}

export const FileTreeContainer: React.FC<FileTreeContainerProps> = ({
    nodes,
    workspacePath,
    onFolderClick
}) => {
    const { openFile } = useEditorStore();
    const { refreshFolder } = useFileSystem();
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [showNewFileDialog, setShowNewFileDialog] = useState(false);
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
        await onFolderClick(path);
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

    const handleCreateFile = async () => {
        if (!newItemName) return;
        const parentDir = selectedFolder || workspacePath;
        const filePath = parentDir.endsWith('/') ? parentDir + newItemName : parentDir + '/' + newItemName;
        try {
            await writeTextFile(filePath, '');
            await refreshFolder(parentDir);
            setShowNewFileDialog(false);
            setNewItemName('');
            // Open the newly created file
            openFile(filePath, '');
            toast.success('File created successfully');
        } catch (err) {
            console.error('Failed to create file:', err);
            toast.error('Failed to create file');
        }
    };

    const handleCreateFolder = async () => {
        if (!newItemName) return;
        const parentDir = selectedFolder || workspacePath;
        const folderPath = parentDir.endsWith('/') ? parentDir + newItemName : parentDir + '/' + newItemName;
        try {
            const result = await invoke<FileOpResult>('create_dir', { path: folderPath });
            if (result.success) {
                await refreshFolder(parentDir);
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
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 hover:bg-accent flex items-center gap-1.5"
                        onClick={() => setShowNewFileDialog(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <FileIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 hover:bg-accent flex items-center gap-1.5"
                        onClick={() => setShowNewFolderDialog(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <FolderIcon className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div className="p-2 h-[calc(100vh-100px)] overflow-auto">
                <FileTree
                    nodes={nodes}
                    onFileClick={handleFileClick}
                    onFolderClick={handleFolderClick}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onMove={handleMove}
                />
            </div>

            {/* New File Dialog */}
            <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileIcon className="h-5 w-5" />
                            New File
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Enter file name..."
                            className="col-span-3"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleCreateFile();
                                }
                            }}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                            Parent folder: {selectedFolder || workspacePath}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowNewFileDialog(false);
                            setNewItemName('');
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateFile}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Folder Dialog */}
            <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderIcon className="h-5 w-5" />
                            New Folder
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Enter folder name..."
                            className="col-span-3"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleCreateFolder();
                                }
                            }}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                            Parent folder: {selectedFolder || workspacePath}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowNewFolderDialog(false);
                            setNewItemName('');
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateFolder}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
