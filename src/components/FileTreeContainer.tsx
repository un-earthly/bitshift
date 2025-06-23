import React, { useState, useEffect } from 'react';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import FileTree from './FileTree';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
    FileIcon,
    FolderIcon,
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
    const { refreshFolder, loadFolder, workspacePath, tree: nodes } = useFileSystem();
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
        // await onFolderClick(path);
    };
    const handleOpenFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
            });
            if (selected && typeof selected === 'string') {
                await loadFolder(selected);
            }
        } catch (err) {
            console.error('Failed to open folder:', err);
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

    const handleCreateFile = async () => {
        if (!newItemName) return;
        const parentDir = selectedFolder || workspacePath;
        const filePath = parentDir?.endsWith('/') ? parentDir + newItemName : parentDir + '/' + newItemName;
        try {
            await writeTextFile(filePath, '');
            await refreshFolder(parentDir as string);
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
        const folderPath = parentDir?.endsWith('/') ? parentDir + newItemName : parentDir + '/' + newItemName;
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
                {/* <div className="flex items-center gap-1">
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
                        </Button>
                        </div> */}
                <div className='flex items-center gap-2'>
                    <FilePlusIcon size={18} />
                    <FolderPlusIcon size={18} />
                    <RotateCw size={18} />
                    <CopyMinus size={18} />
                </div>
            </div>

            <div className="p-2 h-screen overflow-auto">
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
                    />
                )}
            </div>


        </div>
    );
};
