import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, BellPlus } from 'lucide-react';
import { Message } from '../types';
import DoctorSuggestion from './DoctorSuggestion';



interface ChatMessageProps {
    message: Message;
    onOpenReminder?: (text: string) => void;
}

export default function ChatMessage({ message, onOpenReminder }: ChatMessageProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.isFromAi ? 'justify-start' : 'justify-end'}`}
        >
            <div className={`flex gap-3 items-end max-w-[85%] md:max-w-[80%] ${message.isFromAi ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${message.isFromAi ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {message.isFromAi ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div>
                    <div className={message.isFromAi ? 'chat-bubble-ai border border-slate-200 shadow-sm' : 'chat-bubble-user shadow-soft'}>
                        <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{message.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`text-[10px] font-medium ${message.isFromAi ? 'text-slate-400' : 'text-white/70'}`}>
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {message.isFromAi && !message.streaming && onOpenReminder && (
                                <button
                                    onClick={() => onOpenReminder(message.message)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                                >
                                    <BellPlus size={12} /> Save as Reminder
                                </button>
                            )}
                        </div>
                    </div>
                        {/* Medical Disclaimer after OCR analysis responses */}
                        {message.isFromAi && !message.streaming && message.isOcrAnalysis && (
                            <div className="ocr-disclaimer">
                                ⚠️ This analysis is for informational purposes only and is not a medical diagnosis. Always consult a qualified healthcare professional.
                            </div>
                        )}

                        {/* Doctor Suggestions — only once the full reply has streamed in */}
                        {message.isFromAi && !message.streaming && (
                            <DoctorSuggestion aiMessage={message.message} />
                        )}
                    </div>
                </div>
        </motion.div>
    );
}
