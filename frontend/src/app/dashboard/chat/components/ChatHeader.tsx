import React from 'react';
import { Bot, Trash2 } from 'lucide-react';
import { useChatContext } from '../context/AiChatContext';

export default function ChatHeader() {
    const { isConnected, clearHistory } = useChatContext();
    return (
        <div className="mb-4 md:mb-6 flex items-center justify-between">
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-secondary flex items-center gap-3">
                    <Bot className="text-primary w-7 h-7 md:w-8 md:h-8" />
                    Health AI Assistant
                </h1>
                <p className="text-muted mt-1 font-medium text-sm md:text-base">
                    Ask questions, check symptoms, or upload a medical report.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={clearHistory}
                    className="hidden sm:flex items-center gap-2 text-muted hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                    title="Clear chat history"
                >
                    <Trash2 size={16} /> Clear
                </button>
                {isConnected ? (
                    <div className="hidden sm:flex items-center gap-2 bg-pastel-mint text-pastel-mintInk px-4 py-1.5 rounded-full text-sm font-bold border border-green-100 shadow-sm">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        AI Online
                    </div>
                ) : (
                    <div className="hidden sm:flex items-center gap-2 bg-slate-50 text-muted px-4 py-1.5 rounded-full text-sm font-bold border border-line shadow-sm">
                        <span className="relative flex h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                        Offline
                    </div>
                )}
            </div>
        </div>
    );
}
