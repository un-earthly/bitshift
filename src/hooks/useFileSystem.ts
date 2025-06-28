import { useState } from 'react';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
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
  isLoading?: boolean; // Track loading state for better UX
  hasLoadedChildren?: boolean; // Track if children have been loaded
}

export const useFileSystem = () => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<{ path: string; content: string }[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);

  const readFolder = async (path: string, depth: number = 1): Promise<FileNode[]> => {
    try {
      const entries = await invoke<FileMetadata[]>('read_dir_metadata', { path, depth });
      const convertToFileNode = (entry: FileMetadata): FileNode => ({
        ...entry,
        isExpanded: false,
        isLoading: false,
        hasLoadedChildren: depth > 1, // Mark as loaded if we fetched children
        children: entry.children?.map(convertToFileNode)
      });
      return entries.map(convertToFileNode);
    } catch (err) {
      console.error('Error reading folder:', path, err);
      return [];
    }
  };

  // Load folder with initial depth of 1 for better performance
  const loadFolder = async (rootPath: string, initialDepth: number = 1) => {
    const rootNodes = await readFolder(rootPath, initialDepth);
    setTree(rootNodes);
    setWorkspacePath(rootPath);
    setActivePath(null);
    setOpenFiles([]);
  };

  // Load entire folder structure (useful for search or when user wants full view)
  const loadFullFolder = async (rootPath: string) => {
    const rootNodes = await readFolder(rootPath, 10); // Use high depth to get everything
    setTree(rootNodes);
    setWorkspacePath(rootPath);
    setActivePath(null);
    setOpenFiles([]);
  };

  // Load specific depth for a folder
  const loadFolderDepth = async (path: string, depth: number) => {
    if (!workspacePath) return;

    if (path === workspacePath) {
      const rootNodes = await readFolder(workspacePath, depth);
      setTree(prevTree => {
        const transferExpandedStates = (newNodes: FileNode[], prevNodes: FileNode[]): FileNode[] => {
          return newNodes.map(newNode => {
            const prevNode = prevNodes.find(p => p.path === newNode.path);
            return {
              ...newNode,
              isExpanded: prevNode?.isExpanded || false,
              isLoading: false,
              hasLoadedChildren: depth > 1,
              children: newNode.children && prevNode?.children
                ? transferExpandedStates(newNode.children, prevNode.children)
                : newNode.children
            };
          });
        };
        return transferExpandedStates(rootNodes, prevTree);
      });
      return;
    }

    const updateNodeInTree = async (nodes: FileNode[], targetPath: string): Promise<FileNode[]> => {
      const updatedNodes = await Promise.all(nodes.map(async node => {
        if (node.path === targetPath) {
          const freshChildren = await readFolder(node.path, depth);
          return {
            ...node,
            children: freshChildren,
            isExpanded: true,
            isLoading: false,
            hasLoadedChildren: depth > 1
          };
        }

        if (node.children && node.children.length > 0) {
          const updatedChildren = await updateNodeInTree(node.children, targetPath);
          return {
            ...node,
            children: updatedChildren
          };
        }

        return node;
      }));

      return updatedNodes;
    };

    const updatedTree = await updateNodeInTree([...tree], path);
    setTree(updatedTree);
  };

  const refreshFolder = async (path: string) => {
    if (!workspacePath) return;

    if (path === workspacePath) {
      const rootNodes = await readFolder(workspacePath, 1); // Keep initial depth
      setTree(prevTree => {
        const transferExpandedStates = (newNodes: FileNode[], prevNodes: FileNode[]): FileNode[] => {
          return newNodes.map(newNode => {
            const prevNode = prevNodes.find(p => p.path === newNode.path);
            return {
              ...newNode,
              isExpanded: prevNode?.isExpanded || false,
              isLoading: false,
              hasLoadedChildren: prevNode?.hasLoadedChildren || false,
              children: newNode.children && prevNode?.children
                ? transferExpandedStates(newNode.children, prevNode.children)
                : newNode.children
            };
          });
        };
        return transferExpandedStates(rootNodes, prevTree);
      });
      return;
    }

    const updateNodeInTree = async (nodes: FileNode[], targetPath: string): Promise<FileNode[]> => {
      const updatedNodes = await Promise.all(nodes.map(async node => {
        if (node.path === targetPath) {
          const freshChildren = await readFolder(node.path);
          return {
            ...node,
            children: freshChildren,
            isExpanded: true,
            isLoading: false,
            hasLoadedChildren: true
          };
        }

        if (node.children && node.children.length > 0) {
          const updatedChildren = await updateNodeInTree(node.children, targetPath);
          return {
            ...node,
            children: updatedChildren
          };
        }

        return node;
      }));

      return updatedNodes;
    };

    const updatedTree = await updateNodeInTree([...tree], path);
    setTree(updatedTree);
  };

  const toggleFolder = async (path: string) => {
    const updateTree = async (nodes: FileNode[]): Promise<FileNode[]> => {
      return Promise.all(nodes.map(async (node) => {
        if (node.path === path) {
          if (node.isExpanded) {
            return { ...node, isExpanded: false };
          } else {
            // Set loading state
            const loadingNode = { ...node, isExpanded: true, isLoading: true };

            // Load children if not already loaded
            let children = node.children;
            if (!node.hasLoadedChildren) {
              children = await readFolder(node.path);
            }

            return {
              ...loadingNode,
              children,
              isLoading: false,
              hasLoadedChildren: true
            };
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
      useEditorStore.getState().openFile(filePath, content);
    } catch (err) {
      console.error('Failed to open file:', filePath, err);
    }
  };

  const createNewFile = async (path: string) => {
    try {
      await writeTextFile(path, '');
      await refreshFolder(path.split('/').slice(0, -1).join('/'));
      await openFile(path);
    } catch (err) {
      console.error('Failed to create file:', path, err);
      throw err;
    }
  };

  const createNewFolder = async (path: string) => {
    try {
      await invoke('create_dir', { path });
      await refreshFolder(path.split('/').slice(0, -1).join('/'));
    } catch (err) {
      console.error('Failed to create folder:', path, err);
      throw err;
    }
  };

  const saveCurrentFile = async () => {
    if (!activePath) return;

    const file = openFiles.find(f => f.path === activePath);
    if (!file) return;

    try {
      await writeTextFile(file.path, file.content);
    } catch (err) {
      console.error('Failed to save file:', file.path, err);
      throw err;
    }
  };

  const saveFileAs = async () => {
    if (!activePath) return;

    const file = openFiles.find(f => f.path === activePath);
    if (!file) return;

    try {
      const savePath = await invoke<string>('show_save_dialog');
      if (savePath) {
        await writeTextFile(savePath, file.content);
        setOpenFiles(prev => prev.map(f =>
          f.path === activePath ? { ...f, path: savePath } : f
        ));
        setActivePath(savePath);
      }
    } catch (err) {
      console.error('Failed to save file as:', err);
      throw err;
    }
  };

  const closeFile = (filePath: string) => {
    setOpenFiles(files => files.filter(f => f.path !== filePath));
    if (activePath === filePath) {
      setActivePath(null);
    }
  };

  const closeCurrentFile = () => {
    if (activePath) {
      closeFile(activePath);
    }
  };

  const updateFileContent = (newContent: string) => {
    setOpenFiles(files =>
      files.map(f =>
        f.path === activePath ? { ...f, content: newContent } : f
      )
    );

    if (activePath) {
      useEditorStore.getState().openFile(activePath, newContent);
    }
  };

  return {
    tree,
    workspacePath,
    openFiles,
    activeFile: openFiles.find(f => f.path === activePath) || null,
    loadFolder,
    loadFullFolder,
    loadFolderDepth,
    refreshFolder,
    openFile,
    closeFile,
    closeCurrentFile,
    updateFileContent,
    setActivePath,
    toggleFolder,
    createNewFile,
    createNewFolder,
    saveCurrentFile,
    saveFileAs
  };
};
