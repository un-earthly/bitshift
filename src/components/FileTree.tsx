import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { getIconForFile } from '@/lib/file-icons';

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

const renderIcon = (node: FileNode) => {
  const { icon: Icon, color } = getIconForFile(node.name, node.is_dir);
  return <Icon className={cn("h-4 w-4", color)} />;
};

const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  onFileClick,
  onFolderClick,
  level = 0
}) => {
  return (
    <ul className={cn("space-y-1", level > 0 && "ml-4")}>
      {nodes.map(node => (
        <li
          key={node.path}
          className="relative"
        >
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md text-sm",
              "hover:bg-accent/50 transition-colors duration-150",
              "cursor-pointer select-none"
            )}
            onClick={() => node.is_dir ? onFolderClick?.(node.path) : onFileClick(node.path)}
          >
            {node.is_dir ? (
              <>
                <span className="text-muted-foreground">
                  {node.isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
                {renderIcon(node)}
                <span>{node.name}</span>
              </>
            ) : (
              <>
                <span className="ml-4" /> {/* Spacing for alignment */}
                {renderIcon(node)}
                <span>{node.name}</span>
              </>
            )}
          </div>

          {node.is_dir && node.isExpanded && node.children && (
            <FileTree
              nodes={node.children}
              onFileClick={onFileClick}
              onFolderClick={onFolderClick}
              level={level + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
};

export default FileTree;
