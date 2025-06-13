import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { LoaderCircle, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface ProjectInitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ProjectStep {
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    markdown?: string;
}

interface ProjectProgress {
    step: ProjectStep;
    current_step: number;
    total_steps: number;
}

export function ProjectInitDialog({ open, onOpenChange }: ProjectInitDialogProps) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [steps, setSteps] = useState<ProjectStep[]>([]);

    useEffect(() => {
        const unsubscribe = listen<ProjectProgress>('project_progress', (event) => {
            const { step, current_step } = event.payload;
            setSteps(prev => {
                const newSteps = [...prev];
                newSteps[current_step] = step;
                return newSteps;
            });
            setCurrentStep(current_step);
        });

        return () => {
            unsubscribe.then(f => f());
        };
    }, []);

    const handleInitialize = async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);
        setSteps([]);
        try {
            await invoke('initialize_project', { prompt });
        } catch (error) {
            console.error('Failed to initialize project:', error);
            setSteps(prev => prev.map(step =>
                step.status === 'running' ? { ...step, status: 'error', markdown: `Error: ${error}` } : step
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const copyMarkdown = async (markdown: string) => {
        try {
            await navigator.clipboard.writeText(markdown);
            // You could add a toast notification here
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Initialize New Project</DialogTitle>
                    <DialogDescription>
                        Describe the project you want to create. Be as specific as possible about the
                        type of project, programming language, frameworks, and any specific features
                        you want to include.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {!isLoading && !steps.length ? (
                        <Textarea
                            placeholder="Example: Create a backend infrastructure for a learning management system in Node.js..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="h-32"
                        />
                    ) : (
                        <div className="grid grid-cols-[400px,1px,1fr] gap-4">
                            <ScrollArea className="h-[400px] rounded-md border p-4">
                                {steps.map((step, index) => (
                                    <div
                                        key={step.id}
                                        className="mb-4 flex items-start gap-3"
                                        onClick={() => setCurrentStep(index)}
                                    >
                                        {step.status === 'running' ? (
                                            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
                                        ) : step.status === 'completed' ? (
                                            <Check className="h-5 w-5 text-green-500" />
                                        ) : step.status === 'error' ? (
                                            <div className="h-5 w-5 text-red-500">×</div>
                                        ) : (
                                            <div className="h-5 w-5 rounded-full border-2" />
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-medium leading-none">{step.title}</h4>
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>

                            <Separator orientation="vertical" />

                            <ScrollArea className="h-[400px] rounded-md border p-4">
                                {steps[currentStep]?.markdown && (
                                    <div className="relative">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0"
                                            onClick={() => copyMarkdown(steps[currentStep].markdown!)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <ReactMarkdown
                                            components={{
                                                code({ children, className }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return match ? (
                                                        <SyntaxHighlighter
                                                            style={oneDark}
                                                            language={match[1]}
                                                            PreTag="div"
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <code className={className}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                            }}
                                        >
                                            {steps[currentStep].markdown}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    {!steps.length && (
                        <Button
                            onClick={handleInitialize}
                            disabled={!prompt.trim() || isLoading}
                            className="ml-2"
                        >
                            {isLoading ? (
                                <>
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                    Initializing...
                                </>
                            ) : (
                                'Initialize Project'
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}