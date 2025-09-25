import React, { useState } from 'react';
import { Button } from './ui/button';
import {
    Sparkles,
    FunctionSquare as Function,
    FileCode,
    Import,
    Loader2,
    Settings,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import WebLLMModelSelector from './WebLLMModelSelector';

interface AICodeToolbarProps {
    onTriggerSuggestion: () => void;
    onGenerateFunction: () => void;
    onGenerateClass: () => void;
    onGenerateImports: () => void;
    isGenerating?: boolean;
    className?: string;
}

export const AICodeToolbar: React.FC<AICodeToolbarProps> = ({
    onTriggerSuggestion,
    onGenerateFunction,
    onGenerateClass,
    onGenerateImports,
    isGenerating = false,
    className
}) => {
    const [showTooltip, setShowTooltip] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState<boolean>(false);

    const buttons = [
        {
            id: 'suggestion',
            icon: Sparkles,
            label: 'AI Suggestion',
            shortcut: 'Ctrl+Shift+Space',
            onClick: onTriggerSuggestion,
            tooltip: 'Get AI-powered code suggestions'
        },
        {
            id: 'function',
            icon: Function,
            label: 'Generate Function',
            shortcut: 'Ctrl+Shift+F',
            onClick: onGenerateFunction,
            tooltip: 'Generate a function based on context'
        },
        {
            id: 'class',
            icon: FileCode,
            label: 'Generate Class',
            shortcut: 'Ctrl+Shift+C',
            onClick: onGenerateClass,
            tooltip: 'Generate a class based on context'
        },
        {
            id: 'imports',
            icon: Import,
            label: 'Generate Imports',
            shortcut: 'Ctrl+Shift+I',
            onClick: onGenerateImports,
            tooltip: 'Generate import statements'
        }
    ];

    return (
        <div className={cn(
            "flex items-center gap-1 p-2 bg-background/50 backdrop-blur-sm border-b border-border/50",
            className
        )}>
            <div className="flex items-center gap-1 mr-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">AI Code</span>
            </div>

            {buttons.map((button) => {
                const Icon = button.icon;
                const isActive = isGenerating;

                return (
                    <div key={button.id} className="relative">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 px-2 text-xs gap-1.5",
                                isActive && "bg-primary/10 text-primary"
                            )}
                            onClick={button.onClick}
                            disabled={isGenerating}
                            onMouseEnter={() => setShowTooltip(button.id)}
                            onMouseLeave={() => setShowTooltip(null)}
                        >
                            {isGenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Icon className="h-3 w-3" />
                            )}
                            <span className="hidden sm:inline">{button.label}</span>
                            <span className="hidden lg:inline text-xs opacity-60">({button.shortcut})</span>
                        </Button>

                        {showTooltip === button.id && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg z-50 whitespace-nowrap">
                                {button.tooltip}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="ml-auto">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setShowSettings(true)}
                >
                    <Settings className="h-3 w-3" />
                    <span className="hidden sm:inline ml-1">Settings</span>
                </Button>
            </div>
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setShowSettings(false)}
                    />
                    <div className="relative bg-background border border-border rounded-md shadow-xl w-[680px] max-w-[95vw] max-h-[85vh] overflow-auto p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium">AI Settings</div>
                            <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                                Close
                            </Button>
                        </div>
                        <WebLLMModelSelector onLoaded={() => setShowSettings(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}; 