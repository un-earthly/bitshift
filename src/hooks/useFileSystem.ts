import { useState } from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { useEditorStore } from '@/store/editorStore';

// Match the Rust struct exactly
interface FileMetadata {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
  children?: FileMetadata[];
}

// Extended interface for UI state
interface FileNode extends FileMetadata {
  isExpanded?: boolean;
}

export const useFileSystem = () => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<{ path: string; content: string }[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);

  const readFolder = async (path: string, depth: number = 1): Promise<FileNode[]> => {
    try {
      const entries = await invoke<FileMetadata[]>('read_dir_metadata', { path, depth });
      console.log("Received metadata:", entries);
      const convertToFileNode = (entry: FileMetadata): FileNode => ({
        ...entry,
        isExpanded: false,
        children: entry.children?.map(convertToFileNode)
      });
      return entries.map(convertToFileNode);
    } catch (err) {
      console.error('Error reading folder:', path, err);
      return [];
    }
  };

  const loadFolder = async (rootPath: string) => {
    const rootNodes = await readFolder(rootPath, 2);
    setTree(rootNodes);
    setActivePath(null);
    setOpenFiles([]);
  };

  const toggleFolder = async (path: string) => {
    const updateTree = async (nodes: FileNode[]): Promise<FileNode[]> => {
      return Promise.all(nodes.map(async (node) => {
        if (node.path === path) {
          if (node.isExpanded) {
            // Just collapse the folder
            return { ...node, isExpanded: false };
          } else {
            // Load children when expanding
            const children = await readFolder(node.path);
            return { ...node, isExpanded: true, children };
          }
        } else if (node.children) {
          return {
            ...node,
            children: await updateTree(node.children),
          };
        }
        return node;
      }));
    };

    const newTree = await updateTree(tree);
    setTree(newTree);
  };

  const openFile = async (filePath: string) => {
    try {
      const content = await readTextFile(filePath);
      if (!openFiles.some(f => f.path === filePath)) {
        setOpenFiles(prev => [...prev, { path: filePath, content }]);
      }
      setActivePath(filePath);
      // Add the file to the editor store
      useEditorStore.getState().openFile(filePath, content);
    } catch (err) {
      console.error('Failed to open file:', filePath, err);
    }
  };

  const updateFileContent = (newContent: string) => {
    setOpenFiles(files =>
      files.map(f =>
        f.path === activePath ? { ...f, content: newContent } : f
      )
    );
  };

  const closeFile = (filePath: string) => {
    setOpenFiles(files => files.filter(f => f.path !== filePath));
    if (activePath === filePath) {
      setActivePath(null);
    }
  };

  return {
    tree,
    openFiles,
    activeFile: openFiles.find(f => f.path === activePath) || null,
    loadFolder,
    openFile,
    closeFile,
    updateFileContent,
    setActivePath,
    toggleFolder,
  };
};
