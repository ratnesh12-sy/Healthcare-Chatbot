"use client";
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id?: number;
    message: string;
    isFromAi: boolean;
    timestamp: Date | string;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/chat/history');
            setMessages(res.data);
        } catch (err) {
            console.error('Failed to fetch chat history');
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = { message: input, isFromAi: false, timestamp: new Date() };
        setMessages([...messages, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/chat/ai-chat', { message: input });
            setMessages(prev => [...prev, { ...res.data, isFromAi: true }]);
        } catch (err) {
            console.error('Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Health AI Assistant</h1>
                <div className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-medium">Online</div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <AnimatePresence>
                        {messages.map((msg, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={msg.id || i}
                                className={`flex ${msg.isFromAi ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`flex gap-3 items-end max-w-[80%] ${msg.isFromAi ? 'flex-row' : 'flex-row-reverse'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.isFromAi ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {msg.isFromAi ? <Bot size={18} /> : <User size={18} />}
                                    </div>
                                    <div className={msg.isFromAi ? 'chat-bubble-ai' : 'chat-bubble-user'}>
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                        <span className="text-[10px] opacity-50 block mt-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 p-4 rounded-xl flex items-center gap-2">
                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                <span className="text-gray-500 text-sm">AI is thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                <form onSubmit={sendMessage} className="p-4 bg-gray-50 border-t flex gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Describe your symptoms..."
                        className="flex-1 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary text-white p-3 rounded-xl hover:bg-indigo-600 transition-colors shadow-lg disabled:opacity-50"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
