import React, { useState } from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Copy,
    Trash,
    Pencil,
    FileIcon,
    FolderIcon,
    FilePlus,
    FolderPlus,
    ClipboardCopy,
    Scissors,
    RotateCw
} from 'lucide-react';
import { ClipboardService } from '@/lib/clipboard';
import { toast } from 'sonner';

interface FileContextMenuProps {
    children: React.ReactNode;
    onRename: (newName: string) => void;
    onDelete: () => void;
    onCopyPath: () => void;
    isDirectory?: boolean;
    fileName: string;
    onLoadDepth?: (depth: number) => void;
    onLoadFull?: () => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
    children,
    onRename,
    onDelete,
    onCopyPath,
    isDirectory = false,
    fileName,
    onLoadDepth,
    onLoadFull,
}) => {
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [newName, setNewName] = useState(fileName);

    const handleCopy = async () => {
        try {
            await ClipboardService.writeText(fileName);
            toast.success('Copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Failed to copy to clipboard');
        }
    };

    const handleCopyPath = async () => {
        try {
            await ClipboardService.writeText(fileName);
            toast.success('Path copied to clipboard');
        } catch (error) {
            console.error('Failed to copy path:', error);
            toast.error('Failed to copy path to clipboard');
        }
    };

    const handleRename = () => {
        if (newName.trim() && newName !== fileName) {
            onRename(newName.trim());
        }
        setShowRenameDialog(false);
    };

    const handleDelete = () => {
        onDelete();
        setShowDeleteDialog(false);
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                    {isDirectory && (
                        <>
                            <ContextMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => onLoadDepth?.(1)}
                            >
                                <RotateCw className="h-4 w-4" />
                                <span>Load 1 Level Deep</span>
                            </ContextMenuItem>
                            <ContextMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => onLoadDepth?.(2)}
                            >
                                <RotateCw className="h-4 w-4" />
                                <span>Load 2 Levels Deep</span>
                            </ContextMenuItem>
                            <ContextMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => onLoadDepth?.(3)}
                            >
                                <RotateCw className="h-4 w-4" />
                                <span>Load 3 Levels Deep</span>
                            </ContextMenuItem>
                            <ContextMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={onLoadFull}
                            >
                                <RotateCw className="h-4 w-4" />
                                <span>Load Full Structure</span>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                        </>
                    )}
                    <ContextMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={() => setShowRenameDialog(true)}
                    >
                        <Pencil className="h-4 w-4" />
                        <span>Rename</span>
                        <ContextMenuShortcut>F2</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={handleCopy}
                    >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={handleCopyPath}
                    >
                        <ClipboardCopy className="h-4 w-4" />
                        <span>Copy Path</span>
                        <ContextMenuShortcut>⌥⌘C</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem
                        className="gap-2 cursor-pointer"
                    >
                        <Scissors className="h-4 w-4" />
                        <span>Cut</span>
                        <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash className="h-4 w-4" />
                        <span>Delete</span>
                        <ContextMenuShortcut>⌫</ContextMenuShortcut>
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename {isDirectory ? 'Folder' : 'File'}</DialogTitle>
                        <DialogDescription>
                            Enter a new name for "{fileName}"
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRename();
                                } else if (e.key === 'Escape') {
                                    setShowRenameDialog(false);
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename} disabled={!newName.trim() || newName === fileName}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {isDirectory ? 'Folder' : 'File'}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{fileName}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ContextMenu;
