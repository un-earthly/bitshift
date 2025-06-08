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

interface FileContextMenuProps {
    children: React.ReactNode;
    onRename: (newName: string) => void;
    onDelete: () => void;
    onCopyPath: () => void;
    isDirectory?: boolean;
    fileName: string;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
    children,
    onRename,
    onDelete,
    onCopyPath,
    isDirectory,
    fileName,
}) => {
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [newFileName, setNewFileName] = useState(fileName);

    const handleRename = () => {
        onRename(newFileName);
        setShowRenameDialog(false);
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
                            >
                                <FilePlus className="h-4 w-4" />
                                <span>New File</span>
                                <ContextMenuShortcut>⌘N</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuItem
                                className="gap-2 cursor-pointer"
                            >
                                <FolderPlus className="h-4 w-4" />
                                <span>New Folder</span>
                                <ContextMenuShortcut>⇧⌘N</ContextMenuShortcut>
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
                        onClick={() => navigator.clipboard.writeText(fileName)}
                    >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={onCopyPath}
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
                        <DialogTitle className="flex items-center gap-2">
                            {isDirectory ? (
                                <FolderIcon className="h-5 w-5 text-blue-500" />
                            ) : (
                                <FileIcon className="h-5 w-5 text-gray-500" />
                            )}
                            Rename {isDirectory ? 'Folder' : 'File'}
                        </DialogTitle>
                        <DialogDescription>
                            Enter a new name for this {isDirectory ? 'folder' : 'file'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 py-4">
                        {isDirectory ? (
                            <FolderIcon className="h-4 w-4 text-blue-500" />
                        ) : (
                            <FileIcon className="h-4 w-4 text-gray-500" />
                        )}
                        <Input
                            value={newFileName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFileName(e.target.value)}
                            placeholder="Enter new name..."
                            className="col-span-3"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRename();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowRenameDialog(false);
                            setNewFileName(fileName);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            {isDirectory ? (
                                <FolderIcon className="h-5 w-5" />
                            ) : (
                                <FileIcon className="h-5 w-5" />
                            )}
                            Delete {isDirectory ? 'Folder' : 'File'}
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{fileName}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onDelete();
                                setShowDeleteDialog(false);
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ContextMenu;
