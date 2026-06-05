"use client";
import { useState } from 'react';
import ReminderModal from '@/components/ReminderModal';
import ChatMessageList from './components/ChatMessageList';
import ChatHeader from './components/ChatHeader';
import ChatInput from './components/ChatInput';
import { AiChatProvider } from './context/AiChatContext';
import { Sparkles } from 'lucide-react';
import { useChatContext } from './context/AiChatContext';

function ChatContent() {
    const { sendMessage } = useChatContext();
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [reminderAiText, setReminderAiText] = useState('');

    const openReminder = (text: string) => {
        setReminderAiText(text);
        setIsReminderOpen(true);
    };

    const suggestions = [
        "I have a persistent headache.",
        "What are the symptoms of flu?",
        "Should I be worried about high blood pressure?",
        "How can I improve my sleep quality?"
    ];

    return (
        <>
            <ChatHeader />
            <div className="flex-1 bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden flex flex-col relative">
                <ChatMessageList 
                    onOpenReminder={openReminder}
                    emptyState={
                        <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-soft">
                                <Sparkles className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-secondary mb-3">How can I help you today?</h2>
                            <p className="text-slate-500 max-w-md mx-auto mb-10 leading-relaxed text-sm md:text-base">
                                I'm your intelligent medical assistant. I can help analyze symptoms, provide lifestyle advice, or <strong>analyze your medical reports</strong>.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                                {suggestions.map((suggestion, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => sendMessage(suggestion, suggestion, false)}
                                        className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-primary/50 hover:shadow-md transition-all group"
                                    >
                                        <p className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">{suggestion}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    }
                />
                <ChatInput />
            </div>

            <ReminderModal 
                isOpen={isReminderOpen} 
                onClose={() => setIsReminderOpen(false)} 
                aiMessage={reminderAiText} 
            />
        </>
    );
}

export default function ChatPage() {
    return (
        <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AiChatProvider>
                <ChatContent />
            </AiChatProvider>
        </div>
    );
}
