import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { getIconForFile } from '@/lib/file-icons';
import { FileContextMenu } from './ContextMenu';

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
}

interface FileTreeProps {
  nodes: FileNode[];
  onFileClick: (path: string) => void;
  onFolderClick?: (path: string) => void;
  onRename?: (oldPath: string, newName: string) => Promise<void>;
  onDelete?: (path: string) => Promise<void>;
  onMove?: (sourcePath: string, targetPath: string) => Promise<void>;
  level?: number;
}

const renderIcon = (node: FileNode) => {
  const { icon: Icon, color } = getIconForFile(node.name, node.is_dir);
  return <Icon className={cn("h-4 w-4", color)} />;
};

const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  onFileClick,
  onFolderClick,
  onRename,
  onDelete,
  onMove,
  level = 0
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const treeRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItem) return;

      const currentNode = nodes.find(node => node.path === selectedItem);
      if (!currentNode) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextNode = findNextNode(nodes, selectedItem);
          if (nextNode) setSelectedItem(nextNode.path);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevNode = findPrevNode(nodes, selectedItem);
          if (prevNode) setSelectedItem(prevNode.path);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (currentNode.is_dir) {
            setExpandedPaths(prev => {
              const next = new Set(prev);
              next.add(currentNode.path);
              return next;
            });
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (currentNode.is_dir) {
            setExpandedPaths(prev => {
              const next = new Set(prev);
              next.delete(currentNode.path);
              return next;
            });
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (currentNode.is_dir) {
            onFolderClick?.(currentNode.path);
            setExpandedPaths(prev => {
              const next = new Set(prev);
              if (next.has(currentNode.path)) {
                next.delete(currentNode.path);
              } else {
                next.add(currentNode.path);
              }
              return next;
            });
          } else {
            onFileClick(currentNode.path);
          }
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, nodes, onFileClick, onFolderClick]);

  const findNextNode = (nodes: FileNode[], currentPath: string): FileNode | null => {
    let found = false;
    let result: FileNode | null = null;

    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (found && !result) {
          result = node;
          return;
        }
        if (node.path === currentPath) {
          found = true;
        }
        if (node.is_dir && expandedPaths.has(node.path) && node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    return result;
  };

  const findPrevNode = (nodes: FileNode[], currentPath: string): FileNode | null => {
    let prev: FileNode | null = null;
    let found = false;

    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.path === currentPath) {
          found = true;
          return;
        }
        prev = node;
        if (node.is_dir && expandedPaths.has(node.path) && node.children) {
          traverse(node.children);
          if (found) return;
        }
      }
    };

    traverse(nodes);
    return prev;
  };

  const handleRename = async (path: string, newName: string) => {
    try {
      await onRename?.(path, newName);
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await onDelete?.(path);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData('text/plain', path);
    setDraggedItem(path);
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    const node = nodes.find(n => n.path === path);
    if (node?.is_dir) {
      setDropTarget(path);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData('text/plain');
    const targetNode = nodes.find(n => n.path === targetPath);
    
    if (!targetNode?.is_dir || sourcePath === targetPath) return;

    const newPath = targetPath + '/' + sourcePath.split('/').pop();
    try {
      await onMove?.(sourcePath, newPath);
    } catch (err) {
      console.error('Failed to move item:', err);
    }
    
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  return (
    <ul ref={treeRef} className={cn("space-y-[2px]", level > 0 && "ml-3 mt-[2px]")}>
      {nodes.map(node => (
        <li key={node.path}>
          <FileContextMenu
            onRename={(newName) => handleRename(node.path, newName)}
            onDelete={() => handleDelete(node.path)}
            onCopyPath={() => navigator.clipboard.writeText(node.path)}
            isDirectory={node.is_dir}
            fileName={node.name}
          >
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-[3px] rounded-sm text-sm group",
                "hover:bg-accent/50 transition-colors duration-75",
                "cursor-pointer select-none text-muted-foreground hover:text-foreground",
                selectedItem === node.path && "bg-accent text-accent-foreground",
                draggedItem === node.path && "opacity-50",
                dropTarget === node.path && "bg-accent/25 border border-accent"
              )}
              onClick={(e) => {
                setSelectedItem(node.path);
                if (node.is_dir) {
                  onFolderClick?.(node.path);
                  setExpandedPaths(prev => {
                    const next = new Set(prev);
                    if (next.has(node.path)) {
                      next.delete(node.path);
                    } else {
                      next.add(node.path);
                    }
                    return next;
                  });
                } else {
                  onFileClick(node.path);
                }
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, node.path)}
              onDragOver={(e) => handleDragOver(e, node.path)}
              onDrop={(e) => handleDrop(e, node.path)}
              onDragEnd={handleDragEnd}
              tabIndex={0}
            >
              {node.is_dir ? (
                <>
                  <ChevronRight 
                    className={cn(
                      "h-4 w-4 transition-transform shrink-0",
                      expandedPaths.has(node.path) && "transform rotate-90"
                    )} 
                  />
                  {renderIcon(node)}
                  <span className="truncate">{node.name}</span>
                </>
              ) : (
                <>
                  <span className="w-4 shrink-0" />
                  {renderIcon(node)}
                  <span className="truncate">{node.name}</span>
                </>
              )}
            </div>
          </FileContextMenu>

          {node.is_dir && expandedPaths.has(node.path) && node.children && (
            <FileTree
              nodes={node.children}
              onFileClick={onFileClick}
              onFolderClick={onFolderClick}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
              level={level + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
};

export default FileTree;
