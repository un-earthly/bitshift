import { LlamaChat } from './LlamaChat';
import './../styles/Chat.css';

interface ChatSidebarProps {
    onDetach: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onDetach }) => {
    return (
        <div className="chat-sidebar">
            <LlamaChat showHeader={true} onDetach={onDetach} />
        </div>
    );
}; 