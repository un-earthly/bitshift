import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

export class ClipboardService {
    static async writeText(text: string): Promise<void> {
        try {
            // First try Tauri's clipboard API
            await writeText(text);
        } catch (error) {
            console.warn('Tauri clipboard failed, falling back to navigator.clipboard:', error);

            // Fallback to browser clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(text);
                } catch (browserError) {
                    console.error('Both Tauri and browser clipboard failed:', browserError);
                    throw new Error('Failed to copy to clipboard');
                }
            } else {
                throw new Error('Clipboard API not available');
            }
        }
    }

    static async readText(): Promise<string> {
        try {
            // First try Tauri's clipboard API
            return await readText();
        } catch (error) {
            console.warn('Tauri clipboard failed, falling back to navigator.clipboard:', error);

            // Fallback to browser clipboard API
            if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    return await navigator.clipboard.readText();
                } catch (browserError) {
                    console.error('Both Tauri and browser clipboard failed:', browserError);
                    throw new Error('Failed to read from clipboard');
                }
            } else {
                throw new Error('Clipboard API not available');
            }
        }
    }

    // Fallback method using document.execCommand for older browsers
    static async writeTextFallback(text: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    resolve();
                } else {
                    reject(new Error('execCommand copy failed'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
} 