import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { Message } from '../types';

interface AiChatContextProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    isTyping: boolean;
    isConnected: boolean;
    sendMessage: (finalMessage: string, displayMessage: string, hasOcr: boolean) => Promise<void>;
    clearHistory: () => void;
}

const AiChatContext = createContext<AiChatContextProps | undefined>(undefined);

export function AiChatProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const isConnected = true; // For now, assumed connected when page loads

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/chat/history');
            setMessages(res.data);
        } catch (err) {
            console.error('Failed to fetch chat history');
        }
    };

    const clearHistory = () => setMessages([]);

    const sendMessage = async (finalMessage: string, displayMessage: string, hasOcr: boolean) => {
        const userMsg: Message = { message: displayMessage, isFromAi: false, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const res = await api.post('/chat/ai-chat', { message: finalMessage });
            setMessages(prev => [...prev, {
                ...res.data,
                isFromAi: true,
                isOcrAnalysis: hasOcr
            }]);
        } catch (err: any) {
            console.error('Failed to send message', err);
            const errorMessage = err.response?.data || 'Sorry, the AI service is currently unavailable. Please try again later.';
            setMessages(prev => [...prev, { 
                message: typeof errorMessage === 'string' ? errorMessage : 'Sorry, the AI service encountered an error.', 
                isFromAi: true, 
                timestamp: new Date() 
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <AiChatContext.Provider value={{ messages, setMessages, isTyping, isConnected, sendMessage, clearHistory }}>
            {children}
        </AiChatContext.Provider>
    );
}

export const useChatContext = () => {
    const context = useContext(AiChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within an AiChatProvider');
    }
    return context;
};
