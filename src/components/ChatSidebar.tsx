import { LlamaChat } from './LlamaChat';
import './../styles/Chat.css';

interface ChatSidebarProps {
    onDetach: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onDetach }) => {
    return (
        <div className="w-full h-full">
            <LlamaChat showHeader={true} onDetach={onDetach} />
        </div>
    );
}; 