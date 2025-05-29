import { useState } from 'react';
import { readDir, BaseDirectory } from '@tauri-apps/plugin-fs';

interface Node {
  name: string;
  path: string;
  isDir: boolean;
  children?: Node[];
}

const useFileSystem = () => {
  const [tree, setTree] = useState<Node[]>([]);
  const [openFiles, setOpenFiles] = useState<{ path: string; content: string }[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);

  // Recursive folder reading function
  const readFolderRecursive = (folderPath: string): Node[] => {
    let nodes: Node[] = [];
    try {
      const items = readDir(folderPath);
      for (const item of items) {
        const itemPath = path.join(folderPath, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          nodes.push({
            name: item,
            path: itemPath,
            isDir: true,
            children: readFolderRecursive(itemPath),
          });
        } else {
          nodes.push({
            name: item,
            path: itemPath,
            isDir: false,
          });
        }
      }
    } catch (err) {
      console.error('Error reading folder', folderPath, err);
    }
    return nodes;
  };

  const loadFolder = (folderPath: string) => {
    const treeData = readFolderRecursive(folderPath);
    setTree(treeData);
    setActivePath(null);
    setOpenFiles([]);
  };

  const openFile = (filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      setOpenFiles([{ path: filePath, content }]);
      setActivePath(filePath);
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

  return {
    tree,
    openFiles,
    activeFile: openFiles.find(f => f.path === activePath) || null,
    loadFolder,
    openFile,
    updateFileContent,
    setActivePath,
  };
};

export default useFileSystem;
