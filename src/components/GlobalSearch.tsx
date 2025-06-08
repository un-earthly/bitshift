import React, { useState } from 'react';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';

interface SearchResult {
    file: string;
    line: number;
    preview: string;
}

async function searchFiles(dir: string, query: string, results: SearchResult[], maxDepth = 10) {
    if (maxDepth < 0) return;
    try {
        const entries = await readDir(dir);
        // for (const entry of entries) {
        //     if (entry.name) {
        //         await searchFiles(entry.path, query, results, maxDepth - 1);
        //     } else {
        //         try {
        //             const content = await readTextFile(entry.path);
        //             const lines = content.split('\n');
        //             lines.forEach((line, idx) => {
        //                 if (line.toLowerCase().includes(query.toLowerCase())) {
        //                     results.push({ file: entry.path, line: idx + 1, preview: line.trim() });
        //                 }
        //             });
        //         } catch { }
        //     }
        // }
    } catch { }
}

const GlobalSearch: React.FC<{ root: string }> = ({ root }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const found: SearchResult[] = [];
        await searchFiles(root, query, found);
        setResults(found);
        setLoading(false);
    };

    return (
        <div className="w-full h-full flex flex-col">
            <form onSubmit={handleSearch} className="flex gap-2 p-2 border-b">
                <input
                    className="flex-1 px-2 py-1 rounded border"
                    placeholder="Search across workspace..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Search</button>
            </form>
            <div className="flex-1 overflow-auto p-2">
                {loading && <div>Searching...</div>}
                {!loading && results.length === 0 && query && <div>No results found.</div>}
                <ul>
                    {results.map((r, i) => (
                        <li key={i} className="mb-2">
                            <div className="font-mono text-xs text-gray-700">
                                {r.file} : {r.line}
                            </div>
                            <div className="text-sm">{r.preview}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default GlobalSearch;
