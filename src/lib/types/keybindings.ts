export interface Keybinding {
  key: string;
  command: string;
  when?: string;
  args?: {
    sticky?: boolean;
    text?: string;
    kind?: string;
  };
}

export type KeybindingsConfig = Keybinding[];

export type Direction = 'up' | 'down' | 'left' | 'right';
export type ExtendedDirection = Direction | 'home' | 'end' | 'top' | 'bottom';
export type ScrollAmount = 'line' | 'page';

export interface EditorPosition {
  lineNumber: number;
  column: number;
}

export interface EditorSelection {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface EditorState {
  position: EditorPosition;
  selection: EditorSelection | null;
  scrollTop: number;
  scrollLeft: number;
}

export interface EditorContext {
  hasSelection: boolean;
  isMultipleSelection: boolean;
  isInZenMode: boolean;
  isInReferenceSearch: boolean;
  isInInlineEdit: boolean;
  isInChat: boolean;
  isTextFocused: boolean;
  isReadOnly: boolean;
}

export type CommandHandler = () => void | Promise<void>;

export interface CommandMap {
  [key: string]: CommandHandler | undefined;
}