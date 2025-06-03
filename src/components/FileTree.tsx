import React from 'react';
import '../styles/FileTree.css';

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
  level?: number;
}

const FileTree: React.FC<FileTreeProps> = ({ 
  nodes, 
  onFileClick, 
  onFolderClick,
  level = 0 
}) => {
  return (
    <ul className="file-tree">
      {nodes.map(node => (
        <li
          key={node.path}
          className={`file-tree-item ${node.is_dir ? 'folder' : 'file'}`}
          style={{ paddingLeft: `${level * 16}px` }}
        >
          {node.is_dir ? (
            <>
              <span
                className="folder-toggle"
                onClick={() => onFolderClick?.(node.path)}
                style={{ cursor: 'pointer', userSelect: 'none', marginRight: '6px' }}
              >
                {node.isExpanded ? '▼' : '▶'}
              </span>
              <span onClick={() => onFolderClick?.(node.path)}>{node.name}</span>
              {node.isExpanded && node.children && (
                <FileTree
                  nodes={node.children}
                  onFileClick={onFileClick}
                  onFolderClick={onFolderClick}
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
