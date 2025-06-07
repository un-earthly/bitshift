import {
    DiJavascript1, DiPython, DiReact, DiCss3, DiHtml5,
    DiGit, DiNpm, DiSass, DiLess,
    DiRust, DiMarkdown, DiJava, DiPhp, DiPostgresql,
} from 'react-icons/di';
import {
    SiTypescript, SiJson, SiToml,
    SiYaml, SiVite, SiJest, SiEslint, SiBabel,
    SiWebpack, SiPrettier, SiTailwindcss,
    SiPrisma, SiGraphql, SiDocker, SiNginx,
    SiRollupdotjs
} from 'react-icons/si';
import { VscFile, VscFolder } from 'react-icons/vsc';
import { IconType } from 'react-icons';

interface IconDefinition {
    icon: IconType;
    color: string;
}

// Special filename-based icons
const fileNameIcons = new Map<string, IconDefinition>([
    ['package.json', { icon: DiNpm, color: 'text-red-500' }],
    ['package-lock.json', { icon: DiNpm, color: 'text-red-500' }],
    ['yarn.lock', { icon: DiNpm, color: 'text-blue-500' }],
    ['pnpm-lock.yaml', { icon: DiNpm, color: 'text-yellow-500' }],
    ['.gitignore', { icon: DiGit, color: 'text-orange-600' }],
    ['.eslintrc', { icon: SiEslint, color: 'text-purple-600' }],
    ['.prettierrc', { icon: SiPrettier, color: 'text-pink-500' }],
    ['tsconfig.json', { icon: SiTypescript, color: 'text-blue-600' }],
    ['babel.config.js', { icon: SiBabel, color: 'text-yellow-600' }],
    ['webpack.config.js', { icon: SiWebpack, color: 'text-blue-500' }],
    ['rollup.config.js', { icon: SiRollupdotjs, color: 'text-red-600' }],
    ['vite.config.ts', { icon: SiVite, color: 'text-purple-500' }],
    ['tailwind.config.js', { icon: SiTailwindcss, color: 'text-cyan-500' }],
    ['dockerfile', { icon: SiDocker, color: 'text-blue-500' }],
    ['.dockerignore', { icon: SiDocker, color: 'text-blue-500' }],
    ['nginx.conf', { icon: SiNginx, color: 'text-green-500' }],
    ['.env', { icon: VscFile, color: 'text-yellow-500' }],
]);

// Extension-based icons
const extensionIcons = new Map<string, IconDefinition>([
    // JavaScript/TypeScript
    ['js', { icon: DiJavascript1, color: 'text-yellow-400' }],
    ['jsx', { icon: DiReact, color: 'text-blue-400' }],
    ['ts', { icon: SiTypescript, color: 'text-blue-600' }],
    ['tsx', { icon: DiReact, color: 'text-blue-500' }],

    // Web
    ['html', { icon: DiHtml5, color: 'text-orange-500' }],
    ['css', { icon: DiCss3, color: 'text-blue-400' }],
    ['scss', { icon: DiSass, color: 'text-pink-500' }],
    ['sass', { icon: DiSass, color: 'text-pink-500' }],
    ['less', { icon: DiLess, color: 'text-blue-500' }],

    // Data & Config
    ['json', { icon: SiJson, color: 'text-yellow-500' }],
    ['yaml', { icon: SiYaml, color: 'text-red-500' }],
    ['yml', { icon: SiYaml, color: 'text-red-500' }],
    ['toml', { icon: SiToml, color: 'text-gray-500' }],
    ['md', { icon: DiMarkdown, color: 'text-blue-gray-500' }],
    ['mdx', { icon: DiMarkdown, color: 'text-blue-gray-500' }],

    // Programming Languages
    ['py', { icon: DiPython, color: 'text-blue-500' }],
    ['rs', { icon: DiRust, color: 'text-orange-600' }],
    ['java', { icon: DiJava, color: 'text-red-500' }],
    ['php', { icon: DiPhp, color: 'text-purple-500' }],

    // Testing
    ['test.js', { icon: SiJest, color: 'text-red-600' }],
    ['test.ts', { icon: SiJest, color: 'text-red-600' }],
    ['spec.js', { icon: SiJest, color: 'text-red-600' }],
    ['spec.ts', { icon: SiJest, color: 'text-red-600' }],

    // Database
    ['sql', { icon: DiPostgresql, color: 'text-blue-500' }],
    ['prisma', { icon: SiPrisma, color: 'text-teal-500' }],
    ['graphql', { icon: SiGraphql, color: 'text-pink-600' }],
]);

// Special folder icons
const folderIcons = new Map<string, IconDefinition>([
    ['src', { icon: VscFolder, color: 'text-orange-500' }],
    ['tests', { icon: VscFolder, color: 'text-green-500' }],
    ['public', { icon: VscFolder, color: 'text-blue-500' }],
    ['assets', { icon: VscFolder, color: 'text-yellow-500' }],
    ['components', { icon: VscFolder, color: 'text-purple-500' }],
    ['node_modules', { icon: DiNpm, color: 'text-red-500' }],
    ['.git', { icon: DiGit, color: 'text-orange-600' }],
]);

export function getIconForFile(fileName: string, isDirectory: boolean): IconDefinition {
    if (isDirectory) {
        // Check for special folder names (case-insensitive)
        const folderName = fileName.toLowerCase();
        return folderIcons.get(folderName) || { icon: VscFolder, color: 'text-amber-500' };
    }

    // Check for exact filename matches first (case-insensitive)
    const lowerFileName = fileName.toLowerCase();
    const fileNameIcon = fileNameIcons.get(lowerFileName);
    if (fileNameIcon) return fileNameIcon;

    // Check file extensions
    const ext = fileName.toLowerCase().split('.').pop() || '';

    // Check for special test files
    if (fileName.endsWith('.test.ts') || fileName.endsWith('.test.js') ||
        fileName.endsWith('.spec.ts') || fileName.endsWith('.spec.js')) {
        return { icon: SiJest, color: 'text-red-600' };
    }

    // Check regular extensions
    return extensionIcons.get(ext) || { icon: VscFile, color: 'text-muted-foreground' };
}
