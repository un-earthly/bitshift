import * as monaco from 'monaco-editor';
import { aiCodeGenerationService, CodeContext, CodeSuggestion } from './aiCodeGeneration';
import { getLanguage } from '@/lib/languages';
import { useChatExtensionsStore } from '@/store/chatExtensionsStore';

export class MonacoAIProvider implements monaco.languages.CompletionItemProvider {
    private editor: monaco.editor.IStandaloneCodeEditor;
    private isGenerating = false;
    private lastTriggerTime = 0;
    private debounceDelay = 1000; // 1 second debounce

    constructor(editor: monaco.editor.IStandaloneCodeEditor) {
        this.editor = editor;
    }

    async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
    ): Promise<monaco.languages.CompletionList> {
        // Debounce to avoid too many requests
        const now = Date.now();
        if (now - this.lastTriggerTime < this.debounceDelay) {
            return { suggestions: [] };
        }
        this.lastTriggerTime = now;

        // Don't trigger on certain contexts
        if (context.triggerKind === monaco.languages.CompletionTriggerKind.TriggerCharacter) {
            const triggerCharacter = context.triggerCharacter;
            if (triggerCharacter === ' ' || triggerCharacter === '\n' || triggerCharacter === '\t') {
                return { suggestions: [] };
            }
        }

        try {
            const codeContext = await this.buildCodeContext(model, position);
            const suggestions = await aiCodeGenerationService.generateCompletion(codeContext, {
                maxTokens: 50,
                temperature: 0.2,
                suggestionType: 'completion'
            });

            return {
                suggestions: suggestions.map(suggestion => this.convertToMonacoSuggestion(suggestion))
            };
        } catch (error) {
            console.error('Failed to provide AI completions:', error);
            return { suggestions: [] };
        }
    }

    private async buildCodeContext(
        model: monaco.editor.ITextModel,
        position: monaco.Position
    ): Promise<CodeContext> {
        const filePath = model.uri.fsPath;
        const language = getLanguage(filePath);
        const currentLine = model.getLineContent(position.lineNumber);
        const selectedText = this.getSelectedText(model);

        // Get surrounding lines for context
        const surroundingLines: string[] = [];
        const contextLines = 5; // Number of lines before and after cursor

        for (let i = Math.max(1, position.lineNumber - contextLines);
            i <= Math.min(model.getLineCount(), position.lineNumber + contextLines);
            i++) {
            surroundingLines.push(model.getLineContent(i));
        }

        // Get project context from store
        const { projectContext } = useChatExtensionsStore.getState();

        return {
            filePath,
            language,
            currentLine,
            cursorPosition: {
                line: position.lineNumber,
                column: position.column
            },
            selectedText,
            surroundingLines,
            projectContext
        };
    }

    private getSelectedText(model: monaco.editor.ITextModel): string | undefined {
        const selection = this.editor.getSelection();
        if (selection && !selection.isEmpty()) {
            return model.getValueInRange(selection);
        }
        return undefined;
    }

    private convertToMonacoSuggestion(suggestion: CodeSuggestion): monaco.languages.CompletionItem {
        const kind = this.mapSuggestionKind(suggestion.kind);

        return {
            label: suggestion.text,
            kind: kind,
            insertText: suggestion.text,
            detail: suggestion.detail,
            documentation: suggestion.documentation ? {
                value: suggestion.documentation
            } : undefined,
            range: new monaco.Range(
                suggestion.range.startLineNumber,
                suggestion.range.startColumn,
                suggestion.range.endLineNumber,
                suggestion.range.endColumn
            ),
            sortText: '0', // Prioritize AI suggestions
            filterText: suggestion.text,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        };
    }

    private mapSuggestionKind(kind: string): monaco.languages.CompletionItemKind {
        switch (kind) {
            case 'function':
                return monaco.languages.CompletionItemKind.Function;
            case 'class':
                return monaco.languages.CompletionItemKind.Class;
            case 'variable':
                return monaco.languages.CompletionItemKind.Variable;
            case 'import':
                return monaco.languages.CompletionItemKind.Module;
            case 'snippet':
                return monaco.languages.CompletionItemKind.Snippet;
            default:
                return monaco.languages.CompletionItemKind.Text;
        }
    }

    // Method to trigger AI completion manually (e.g., via keyboard shortcut)
    async triggerAISuggestion(): Promise<void> {
        if (this.isGenerating) return;

        try {
            this.isGenerating = true;
            const position = this.editor.getPosition();
            const model = this.editor.getModel();

            if (!position || !model) return;

            const codeContext = await this.buildCodeContext(model, position);
            const suggestions = await aiCodeGenerationService.generateCompletion(codeContext, {
                maxTokens: 100,
                temperature: 0.3,
                suggestionType: 'completion'
            });

            if (suggestions.length > 0) {
                // Show suggestions in a custom UI or insert the first suggestion
                const firstSuggestion = suggestions[0];
                this.insertSuggestion(firstSuggestion);
            }
        } catch (error) {
            console.error('Failed to trigger AI suggestion:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    private insertSuggestion(suggestion: CodeSuggestion): void {
        const position = this.editor.getPosition();
        if (!position) return;

        const range = new monaco.Range(
            suggestion.range.startLineNumber,
            suggestion.range.startColumn,
            suggestion.range.endLineNumber,
            suggestion.range.endColumn
        );

        this.editor.executeEdits('ai-suggestion', [{
            range,
            text: suggestion.text
        }]);
    }

    // Method to generate function based on selected text or context
    async generateFunction(functionName?: string): Promise<void> {
        if (this.isGenerating) return;

        try {
            this.isGenerating = true;
            const position = this.editor.getPosition();
            const model = this.editor.getModel();

            if (!position || !model) return;

            const codeContext = await this.buildCodeContext(model, position);
            const suggestions = await aiCodeGenerationService.generateFunction(codeContext, functionName);

            if (suggestions.length > 0) {
                const suggestion = suggestions[0];
                this.insertSuggestion(suggestion);
            }
        } catch (error) {
            console.error('Failed to generate function:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    // Method to generate class based on context
    async generateClass(className?: string): Promise<void> {
        if (this.isGenerating) return;

        try {
            this.isGenerating = true;
            const position = this.editor.getPosition();
            const model = this.editor.getModel();

            if (!position || !model) return;

            const codeContext = await this.buildCodeContext(model, position);
            const suggestions = await aiCodeGenerationService.generateClass(codeContext, className);

            if (suggestions.length > 0) {
                const suggestion = suggestions[0];
                this.insertSuggestion(suggestion);
            }
        } catch (error) {
            console.error('Failed to generate class:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    // Method to generate import statements
    async generateImports(moduleName?: string): Promise<void> {
        if (this.isGenerating) return;

        try {
            this.isGenerating = true;
            const position = this.editor.getPosition();
            const model = this.editor.getModel();

            if (!position || !model) return;

            const codeContext = await this.buildCodeContext(model, position);
            const suggestions = await aiCodeGenerationService.generateImports(codeContext, moduleName);

            if (suggestions.length > 0) {
                const suggestion = suggestions[0];
                this.insertSuggestion(suggestion);
            }
        } catch (error) {
            console.error('Failed to generate imports:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    // Cleanup method
    dispose(): void {
        // Cleanup any resources if needed
    }
} 