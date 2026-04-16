"use client";
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Send, Bot, User, Loader2, AlertCircle, Sparkles, Mic, MicOff } from 'lucide-react';
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

    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const isListeningRef = useRef(false);
    const lastRestartTimeRef = useRef(0);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            
            if (SpeechRecognition) {
                const speechInstance = new SpeechRecognition();
                speechInstance.continuous = true;
                speechInstance.interimResults = true;
                // Let the browser decide the default language for best compatibility
                // speechInstance.lang = 'en-US';

                speechInstance.onresult = (event: any) => {
                    let currentInterim = '';
                    let final = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript;
                        } else {
                            currentInterim += event.results[i][0].transcript;
                        }
                    }

                    if (final) {
                        const finalTrimmed = final.trim();
                        if (finalTrimmed) {
                            setInput((prev) => {
                                const prevTrimmed = prev.trim();
                                return prevTrimmed ? `${prevTrimmed} ${finalTrimmed}` : finalTrimmed;
                            });
                        }
                    }
                    
                    setInterimTranscript(currentInterim);
                };

                speechInstance.onend = () => {
                    if (isListeningRef.current) {
                        const now = Date.now();
                        if (now - lastRestartTimeRef.current > 300) {
                            try {
                                lastRestartTimeRef.current = now;
                                speechInstance.start();
                            } catch (err) {
                                console.error("Error auto-restarting recognition:", err);
                            }
                        }
                    } else {
                        setIsListening(false);
                        setInterimTranscript('');
                    }
                };

                speechInstance.onerror = (event: any) => {
                    console.error("Speech recognition error:", event.error);
                    if (event.error === 'not-allowed') {
                        alert("Microphone access denied. Please enable it in browser settings.");
                    }
                    setIsListening(false);
                    setInterimTranscript('');
                };

                setRecognition(speechInstance);

                return () => {
                    if (speechInstance) {
                        speechInstance.stop();
                    }
                };
            }
        }
    }, []);

    useEffect(() => {
        if (interimTranscript) {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [interimTranscript]);

    const toggleListening = () => {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
            setIsListening(false);
            setInterimTranscript('');
        } else {
            try {
                recognition.start();
                setIsListening(true);
            } catch (err) {
                console.error("Error starting recognition:", err);
            }
        }
    };

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

        if (isListeningRef.current && recognition) {
            recognition.stop();
            setIsListening(false);
            setInterimTranscript('');
        }

        const finalMessage = input.trim();
        if (!finalMessage) return;

        const userMsg: Message = { message: finalMessage, isFromAi: false, timestamp: new Date() };
        setMessages([...messages, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/chat/ai-chat', { message: finalMessage });
            setMessages(prev => [...prev, { ...res.data, isFromAi: true }]);
        } catch (err: any) {
            console.error('Failed to send message', err);
            const errorMessage = err.response?.data || 'Sorry, the AI service is currently unavailable. Please try again later.';
            setMessages(prev => [...prev, { message: typeof errorMessage === 'string' ? errorMessage : 'Sorry, the AI service encountered an error.', isFromAi: true, timestamp: new Date() }]);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        "I have a persistent headache.",
        "What are the symptoms of flu?",
        "Should I be worried about high blood pressure?",
        "How can I improve my sleep quality?"
    ];

    return (
        <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary flex items-center gap-3">
                        <Bot className="text-primary w-8 h-8" />
                        Health AI Assistant
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Ask questions, check symptoms, or get health tips.</p>
                </div>
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold border border-green-100 shadow-sm">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    AI Online
                </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden flex flex-col relative">
                
                {/* Disclaimer Banner */}
                <div className="bg-orange-50/80 border-b border-orange-100 px-6 py-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-orange-800 leading-relaxed font-medium">
                        <span className="font-bold">Medical Disclaimer:</span> This AI assistant provides general informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician for any medical conditions.
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-soft">
                                <Sparkles className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-secondary mb-3">How can I help you today?</h2>
                            <p className="text-slate-500 max-w-md mx-auto mb-10 leading-relaxed">
                                I'm your intelligent medical assistant. I can help analyze symptoms, provide lifestyle advice, and point you in the right direction.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                                {suggestions.map((suggestion, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setInput(suggestion)}
                                        className="p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-primary/50 hover:shadow-md transition-all group"
                                    >
                                        <p className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">{suggestion}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <AnimatePresence>
                        {messages.map((msg, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={msg.id || i}
                                className={`flex ${msg.isFromAi ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`flex gap-3 items-end max-w-[80%] ${msg.isFromAi ? 'flex-row' : 'flex-row-reverse'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${msg.isFromAi ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        {msg.isFromAi ? <Bot size={22} /> : <User size={22} />}
                                    </div>
                                    <div className={msg.isFromAi ? 'chat-bubble-ai border border-slate-200 shadow-sm' : 'chat-bubble-user shadow-soft'}>
                                        <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.message}</p>
                                        <span className={`text-[10px] block mt-2 font-medium ${msg.isFromAi ? 'text-slate-400' : 'text-white/70'}`}>
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

                <form onSubmit={sendMessage} className="p-5 bg-white border-t border-slate-100 flex gap-4 items-end">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl flex items-center shadow-inner focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden p-1">
                        <textarea
                            value={input + (interimTranscript ? (input ? ' ' : '') + interimTranscript : '')}
                            onChange={(e) => {
                                let newValue = e.target.value;
                                if (interimTranscript && newValue.endsWith(interimTranscript)) {
                                    newValue = newValue.slice(0, -interimTranscript.length).trim();
                                }
                                setInput(newValue);
                                if (isListeningRef.current && recognition) {
                                    toggleListening();
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage(e);
                                }
                            }}
                            placeholder="Type or speak your health-related concern..."
                            className="flex-1 max-h-32 min-h-[50px] bg-transparent border-none outline-none resize-none p-3 text-secondary text-sm md:text-base"
                            rows={1}
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={toggleListening}
                            disabled={!recognition}
                            title={
                                !recognition ? "Voice input not supported in this browser" 
                                : isListening ? "Stop listening" 
                                : "Start voice typing"
                            }
                            className={`p-4 rounded-2xl transition-all shadow-md flex-shrink-0 ${
                                !recognition 
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    : isListening 
                                        ? 'bg-red-50 text-red-500 border border-red-200 animate-pulse hover:bg-red-100' 
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                            }`}
                        >
                            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                        </button>

                        <button
                            type="submit"
                            disabled={loading || (!input.trim() && !interimTranscript)}
                            className="bg-primary text-white p-4 rounded-2xl hover:bg-teal-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 flex-shrink-0"
                        >
                            <Send size={22} className={loading ? "animate-pulse" : ""} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
