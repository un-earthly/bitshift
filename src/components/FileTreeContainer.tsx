import React from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '@/store/editorStore';
import FileTree from './FileTree';

interface FileTreeContainerProps {
    nodes: any;
    onFolderClick?: (path: string) => void;
}

export const FileTreeContainer: React.FC<FileTreeContainerProps> = ({
    nodes,
    onFolderClick,
}) => {
    const { openFile } = useEditorStore();

    const handleFileClick = async (path: string) => {
        try {
            const content = await readTextFile(path);
            openFile(path, content);
        } catch (err) {
            console.error('Failed to open file:', path, err);
        }
    };

    return (
        <FileTree
            nodes={nodes}
            onFileClick={handleFileClick}
            onFolderClick={onFolderClick}
        />
    );
};
