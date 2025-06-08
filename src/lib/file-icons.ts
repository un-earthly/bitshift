import {
    FileIcon,
    FileJson,
    FileText,
    FileCode,
    FileImage,
    FileVideo,
    FileAudio,
    FileCog,
    FileArchive,
    FileSpreadsheet,
    FileTerminal,
    FolderIcon,
    FolderOpen,
    FolderGit,
    Package,
    Cog,
    Globe,
    FileType,
    FileType2,
    FileCheck,
    FileWarning,
    FileX,
    LucideIcon,
    Folder
} from 'lucide-react';

interface IconInfo {
    icon: LucideIcon;
    color: string;
}

const fileExtensionMap: { [key: string]: IconInfo } = {
    // Config files
    'json': { icon: FileJson, color: 'text-yellow-500' },
    'yaml': { icon: FileCode, color: 'text-red-500' },
    'yml': { icon: FileCode, color: 'text-red-500' },
    'toml': { icon: FileCode, color: 'text-orange-500' },
    'ini': { icon: FileCog, color: 'text-gray-500' },
    'env': { icon: FileCog, color: 'text-green-500' },

    // Web files
    'html': { icon: Globe, color: 'text-orange-500' },
    'css': { icon: FileCode, color: 'text-blue-500' },
    'scss': { icon: FileCode, color: 'text-pink-500' },
    'sass': { icon: FileCode, color: 'text-pink-500' },
    'less': { icon: FileCode, color: 'text-blue-400' },

    // JavaScript/TypeScript
    'js': { icon: FileCode, color: 'text-yellow-500' },
    'jsx': { icon: FileCode, color: 'text-blue-400' },
    'ts': { icon: FileType, color: 'text-blue-500' },
    'tsx': { icon: FileType2, color: 'text-blue-400' },

    // Programming languages
    'py': { icon: FileCode, color: 'text-blue-500' },
    'rs': { icon: FileCode, color: 'text-orange-500' },
    'go': { icon: FileCode, color: 'text-blue-400' },
    'java': { icon: FileCode, color: 'text-red-500' },
    'cpp': { icon: FileCode, color: 'text-blue-500' },
    'c': { icon: FileCode, color: 'text-blue-600' },
    'h': { icon: FileCode, color: 'text-purple-500' },
    'hpp': { icon: FileCode, color: 'text-purple-500' },
    'cs': { icon: FileCode, color: 'text-purple-600' },
    'rb': { icon: FileCode, color: 'text-red-500' },
    'php': { icon: FileCode, color: 'text-purple-400' },
    'swift': { icon: FileCode, color: 'text-orange-500' },
    'kt': { icon: FileCode, color: 'text-orange-400' },

    // Shell scripts
    'sh': { icon: FileTerminal, color: 'text-green-500' },
    'bash': { icon: FileTerminal, color: 'text-green-500' },
    'zsh': { icon: FileTerminal, color: 'text-green-500' },
    'fish': { icon: FileTerminal, color: 'text-green-500' },
    'ps1': { icon: FileTerminal, color: 'text-blue-500' },

    // Documentation
    'md': { icon: FileText, color: 'text-blue-500' },
    'txt': { icon: FileText, color: 'text-gray-500' },
    'pdf': { icon: FileText, color: 'text-red-500' },
    'doc': { icon: FileText, color: 'text-blue-600' },
    'docx': { icon: FileText, color: 'text-blue-600' },

    // Images
    'png': { icon: FileImage, color: 'text-purple-500' },
    'jpg': { icon: FileImage, color: 'text-purple-500' },
    'jpeg': { icon: FileImage, color: 'text-purple-500' },
    'gif': { icon: FileImage, color: 'text-purple-500' },
    'svg': { icon: FileImage, color: 'text-orange-500' },
    'webp': { icon: FileImage, color: 'text-purple-500' },

    // Audio/Video
    'mp3': { icon: FileAudio, color: 'text-purple-500' },
    'wav': { icon: FileAudio, color: 'text-purple-500' },
    'mp4': { icon: FileVideo, color: 'text-purple-500' },
    'mov': { icon: FileVideo, color: 'text-purple-500' },
    'avi': { icon: FileVideo, color: 'text-purple-500' },

    // Archives
    'zip': { icon: FileArchive, color: 'text-yellow-500' },
    'tar': { icon: FileArchive, color: 'text-yellow-500' },
    'gz': { icon: FileArchive, color: 'text-yellow-500' },
    'rar': { icon: FileArchive, color: 'text-yellow-500' },
    '7z': { icon: FileArchive, color: 'text-yellow-500' },

    // Data
    'csv': { icon: FileSpreadsheet, color: 'text-green-500' },
    'xls': { icon: FileSpreadsheet, color: 'text-green-600' },
    'xlsx': { icon: FileSpreadsheet, color: 'text-green-600' },
    'db': { icon: FileSpreadsheet, color: 'text-blue-500' },
    'sql': { icon: FileSpreadsheet, color: 'text-blue-500' },

    // Package files
    'lock': { icon: Package, color: 'text-red-500' },
};

const specialFileMap: { [key: string]: IconInfo } = {
    'package.json': { icon: Package, color: 'text-red-500' },
    'package-lock.json': { icon: Package, color: 'text-red-500' },
    'yarn.lock': { icon: Package, color: 'text-blue-500' },
    'pnpm-lock.yaml': { icon: Package, color: 'text-orange-500' },
    '.gitignore': { icon: FileWarning, color: 'text-gray-500' },
    '.env': { icon: FileCog, color: 'text-green-500' },
    '.env.local': { icon: FileCog, color: 'text-green-500' },
    '.env.development': { icon: FileCog, color: 'text-green-500' },
    '.env.production': { icon: FileCog, color: 'text-green-500' },
    'dockerfile': { icon: FileCode, color: 'text-blue-500' },
    'docker-compose.yml': { icon: FileCode, color: 'text-blue-500' },
    'readme.md': { icon: FileCheck, color: 'text-blue-500' },
    'license': { icon: FileCheck, color: 'text-gray-500' },
    'license.md': { icon: FileCheck, color: 'text-gray-500' },
    'license.txt': { icon: FileCheck, color: 'text-gray-500' },
};

const specialFolderMap: { [key: string]: IconInfo } = {
    '.git': { icon: FolderGit, color: 'text-orange-500' },
    'node_modules': { icon: Folder, color: 'text-green-500' },
    'src': { icon: FolderOpen, color: 'text-blue-500' },
    'public': { icon: FolderOpen, color: 'text-yellow-500' },
    'assets': { icon: FolderOpen, color: 'text-purple-500' },
    'components': { icon: FolderOpen, color: 'text-blue-400' },
    'pages': { icon: FolderOpen, color: 'text-blue-500' },
    'utils': { icon: FolderOpen, color: 'text-gray-500' },
    'lib': { icon: FolderOpen, color: 'text-gray-500' },
    'test': { icon: FolderOpen, color: 'text-green-500' },
    'tests': { icon: FolderOpen, color: 'text-green-500' },
    'docs': { icon: FolderOpen, color: 'text-blue-500' },
    'dist': { icon: FolderOpen, color: 'text-yellow-500' },
    'build': { icon: FolderOpen, color: 'text-yellow-500' },
};

export function getIconForFile(name: string, isDirectory: boolean): IconInfo {
    if (isDirectory) {
        const folderName = name.toLowerCase();
        return specialFolderMap[folderName] || { icon: FolderIcon, color: 'text-blue-500' };
    }

    // Check for special files first
    const fileName = name.toLowerCase();
    if (specialFileMap[fileName]) {
        return specialFileMap[fileName];
    }

    // Then check file extensions
    const extension = name.split('.').pop()?.toLowerCase() || '';
    return fileExtensionMap[extension] || { icon: FileIcon, color: 'text-gray-500' };
}
