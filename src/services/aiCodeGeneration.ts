import { llmService } from './llmService';

export interface CodeContext {
    filePath: string;
    language: string;
    currentLine: string;
    cursorPosition: { line: number; column: number };
    selectedText?: string;
    surroundingLines: string[];
    projectContext?: string;
    activeFile?: string;
}

export interface CodeSuggestion {
    text: string;
    range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    };
    kind: 'function' | 'variable' | 'class' | 'import' | 'snippet' | 'completion';
    detail?: string;
    documentation?: string;
}

export interface CodeGenerationOptions {
    maxTokens?: number;
    temperature?: number;
    includeContext?: boolean;
    suggestionType?: 'completion' | 'snippet' | 'function' | 'class' | 'import';
}

class AICodeGenerationService {
    private isGenerating = false;
    private currentGeneration: AbortController | null = null;

    /**
     * Generate code completion based on current context
     */
    async generateCompletion(
        context: CodeContext,
        options: CodeGenerationOptions = {}
    ): Promise<CodeSuggestion[]> {
        if (this.isGenerating) {
            await this.stopGeneration();
        }

        const {
            includeContext = true,
            suggestionType = 'completion'
        } = options;

        try {
            this.isGenerating = true;
            this.currentGeneration = new AbortController();

            const prompt = this.buildPrompt(context, suggestionType, includeContext);
            const suggestions: CodeSuggestion[] = [];
            let currentSuggestion = '';

            await llmService.generate(
                [
                    {
                        role: 'system',
                        content: this.getSystemPrompt(context.language, suggestionType)
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                (token: string) => {
                    currentSuggestion += token;
                },
                () => {
                    if (currentSuggestion.trim()) {
                        suggestions.push({
                            text: currentSuggestion.trim(),
                            range: {
                                startLineNumber: context.cursorPosition.line,
                                startColumn: context.cursorPosition.column,
                                endLineNumber: context.cursorPosition.line,
                                endColumn: context.cursorPosition.column
                            },
                            kind: suggestionType as any,
                            detail: `AI-generated ${suggestionType}`,
                            documentation: `Generated based on context in ${context.filePath}`
                        });
                    }
                }
            );

            return suggestions;
        } catch (error) {
            console.error('Failed to generate code completion:', error);
            return [];
        } finally {
            this.isGenerating = false;
            this.currentGeneration = null;
        }
    }

    /**
     * Generate function or method based on context
     */
    async generateFunction(
        context: CodeContext,
    ): Promise<CodeSuggestion[]> {
    
        return this.generateCompletion(context, {
            suggestionType: 'function',
            maxTokens: 200,
            temperature: 0.2
        });
    }

    /**
     * Generate class based on context
     */
    async generateClass(
        context: CodeContext,
    ): Promise<CodeSuggestion[]> {

        return this.generateCompletion(context, {
            suggestionType: 'class',
            maxTokens: 300,
            temperature: 0.2
        });
    }

    /**
     * Generate import statements based on context
     */
    async generateImports(
        context: CodeContext,
    ): Promise<CodeSuggestion[]> {
        return this.generateCompletion(context, {
            suggestionType: 'import',
            maxTokens: 50,
            temperature: 0.1
        });
    }

    /**
     * Stop current generation
     */
    async stopGeneration(): Promise<void> {
        if (this.currentGeneration) {
            this.currentGeneration.abort();
            this.currentGeneration = null;
        }
        this.isGenerating = false;
        await llmService.stopGeneration();
    }

    /**
     * Check if currently generating
     */
    isCurrentlyGenerating(): boolean {
        return this.isGenerating;
    }

    private buildPrompt(
        context: CodeContext,
        suggestionType: string,
        includeContext: boolean
    ): string {
        let prompt = `Generate ${suggestionType} for ${context.language} code.\n\n`;

        if (includeContext) {
            prompt += `File: ${context.filePath}\n`;
            prompt += `Current line: ${context.cursorPosition.line}, column: ${context.cursorPosition.column}\n\n`;

            if (context.surroundingLines.length > 0) {
                prompt += `Surrounding code:\n`;
                context.surroundingLines.forEach((line, index) => {
                    const lineNumber = context.cursorPosition.line - Math.floor(context.surroundingLines.length / 2) + index;
                    prompt += `${lineNumber}: ${line}\n`;
                });
                prompt += '\n';
            }

            if (context.selectedText) {
                prompt += `Selected text: "${context.selectedText}"\n\n`;
            }

            if (context.projectContext) {
                prompt += `Project context:\n${context.projectContext}\n\n`;
            }
        }

        prompt += `Current line content: "${context.currentLine}"\n\n`;
        prompt += `Generate appropriate ${suggestionType} that fits the context and follows best practices for ${context.language}.`;

        return prompt;
    }

    private getSystemPrompt(language: string, suggestionType: string): string {
        const languageSpecificPrompts: { [key: string]: string } = {
            'typescript': 'You are an expert TypeScript developer. Generate clean, well-typed code with proper interfaces and type annotations.',
            'javascript': 'You are an expert JavaScript developer. Generate modern, clean code following ES6+ best practices.',
            'python': 'You are an expert Python developer. Generate clean, readable code following PEP 8 guidelines.',
            'rust': 'You are an expert Rust developer. Generate safe, efficient code with proper error handling and ownership patterns.',
            'go': 'You are an expert Go developer. Generate idiomatic Go code with proper error handling and package structure.',
            'java': 'You are an expert Java developer. Generate clean, object-oriented code following Java conventions.',
            'cpp': 'You are an expert C++ developer. Generate modern C++ code with proper memory management and STL usage.',
            'csharp': 'You are an expert C# developer. Generate clean, object-oriented code following C# conventions.',
        };

        const basePrompt = languageSpecificPrompts[language] || 'You are an expert software developer. Generate clean, maintainable code.';

        return `${basePrompt}

Focus on generating ${suggestionType} that:
- Is syntactically correct for ${language}
- Follows the existing code style and patterns
- Is contextually appropriate
- Includes proper error handling where applicable
- Uses modern best practices
- Is well-documented when appropriate

Only generate the code, no explanations or markdown formatting.`;
    }
}

export const aiCodeGenerationService = new AICodeGenerationService(); 