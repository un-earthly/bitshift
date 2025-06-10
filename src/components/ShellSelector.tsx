import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ShellSelectorProps {
    onSelect: (shell: string) => void;
}

const ShellSelector: React.FC<ShellSelectorProps> = ({ onSelect }) => {
    const [shells, setShells] = useState<string[]>([]);

    useEffect(() => {
        invoke('list_shells').then((result: any) => setShells(result));
    }, []);

    return (
        <select onChange={(e) => onSelect(e.target.value)}>
            <option value="">Default</option>
            {shells.map((shell) => (
                <option key={shell} value={shell}>
                    {shell}
                </option>
            ))}
        </select>
    );
};

export default ShellSelector;