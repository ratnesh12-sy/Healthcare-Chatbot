import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { useChatContext } from '../context/AiChatContext';

interface ChatMessageListProps {
    onOpenReminder?: (text: string) => void;
    emptyState?: React.ReactNode;
}

export default function ChatMessageList({ onOpenReminder, emptyState }: ChatMessageListProps) {
    const { messages, isTyping } = useChatContext();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-surface">
            {messages.length === 0 && !isTyping && emptyState}
            <AnimatePresence>
                {messages.map((msg, i) => (
                    <ChatMessage 
                        key={msg.id || i} 
                        message={msg} 
                        onOpenReminder={onOpenReminder} 
                    />
                ))}
            </AnimatePresence>
            {isTyping && <TypingIndicator />}
            <div ref={scrollRef} />
        </div>
    );
}
