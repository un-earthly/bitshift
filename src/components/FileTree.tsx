import React, { useState } from 'react';
import '../styles/FileTree.css';
interface Node {
  name: string;
  path: string;
  isDir: boolean;
  children?: Node[];
}

interface FileTreeProps {
  nodes: Node[];
  onFileClick: (path: string) => void;
  level?: number;
}

const FileTree: React.FC<FileTreeProps> = ({ nodes, onFileClick, level = 0 }) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const toggleExpand = (path: string) => {
    const newSet = new Set(expandedPaths);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setExpandedPaths(newSet);
  };

  return (
    <ul className="file-tree">
      {nodes.map(node => (
        <li
          key={node.path}
          className={`file-tree-item ${node.isDir ? 'folder' : 'file'}`}
          style={{ paddingLeft: `${level * 16}px` }}
        >
          {node.isDir ? (
            <>
              <span
                className="folder-toggle"
                onClick={() => toggleExpand(node.path)}
                style={{ cursor: 'pointer', userSelect: 'none', marginRight: '6px' }}
              >
                {expandedPaths.has(node.path) ? '▼' : '▶'}
              </span>
              <span onClick={() => onFileClick(node.path)}>{node.name}</span>
              {expandedPaths.has(node.path) && node.children && (
                <FileTree
                  nodes={node.children}
                  onFileClick={onFileClick}
                  level={level + 1}
                />
              )}
            </>
          ) : (
            <span onClick={() => onFileClick(node.path)}>{node.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
};

export default FileTree;
