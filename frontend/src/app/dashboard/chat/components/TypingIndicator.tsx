import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm border border-line">
                <div className="flex gap-1.5 px-2 py-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 bg-slate-400 rounded-full"
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>
                <span className="text-muted text-sm font-medium ml-1">AI is typing...</span>
            </div>
        </div>
    );
}
