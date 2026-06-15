import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { Message } from '../types';

// Same base the axios client uses ('/api' behind the Vercel proxy in prod,
// http://localhost:8081/api in local dev). fetch() is used for the streaming
// endpoint because axios can't read a ReadableStream body in the browser.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';

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

    // Blocking fallback used when streaming is unavailable (proxy buffering,
    // network error, or the server emits an error before any token).
    const sendBlocking = async (finalMessage: string, hasOcr: boolean) => {
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
        }
    };

    const sendMessage = async (finalMessage: string, displayMessage: string, hasOcr: boolean) => {
        const userMsg: Message = { message: displayMessage, isFromAi: false, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // Typewriter reveal. Tokens arrive from the network in lumpy bursts (often a whole
        // sentence at once), so painting each burst directly looked sentence-by-sentence.
        // Instead we accumulate into `fullText` and reveal it smoothly on a ~16ms timer —
        // a few chars per tick, adaptive so it always catches up just after the last token.
        // (setTimeout, not requestAnimationFrame: rAF is paused in background tabs, which would
        // stall the reveal and hang the await; setTimeout keeps progressing.)
        let placeholderAdded = false;
        let receivedToken = false;
        let fullText = '';
        let displayedLen = 0;
        let streamEnded = false;
        let doneMeta: { id?: number; timestamp?: string } | null = null;
        let revealPromise: Promise<void> | null = null;

        const updateBubble = (text: string) => {
            setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.streaming) copy[copy.length - 1] = { ...last, message: text };
                return copy;
            });
        };

        // Reveals buffered text frame-by-frame; resolves once the stream has ended AND
        // everything received has been shown.
        const startReveal = () => new Promise<void>((resolve) => {
            const step = () => {
                if (displayedLen < fullText.length) {
                    const remaining = fullText.length - displayedLen;
                    const inc = Math.min(Math.max(2, Math.ceil(remaining / 12)), 40);
                    displayedLen = Math.min(fullText.length, displayedLen + inc);
                    updateBubble(fullText.slice(0, displayedLen));
                }
                if (streamEnded && displayedLen >= fullText.length) {
                    resolve();
                    return;
                }
                setTimeout(step, 16);
            };
            setTimeout(step, 16);
        });

        const onToken = (token: string) => {
            receivedToken = true;
            fullText += token;
            if (!placeholderAdded) {
                placeholderAdded = true;
                setIsTyping(false); // hide the typing dot once real text starts flowing
                setMessages(prev => [...prev, {
                    message: '', isFromAi: true, timestamp: new Date(),
                    isOcrAnalysis: hasOcr, streaming: true
                }]);
                revealPromise = startReveal();
            }
        };

        // Clears the streaming flag (and stamps id/timestamp from the server) once finished.
        const finalize = (meta: { id?: number; timestamp?: string } | null) => {
            setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.streaming) {
                    copy[copy.length - 1] = {
                        ...last,
                        message: fullText || last.message,
                        streaming: false,
                        id: meta?.id ?? last.id,
                        timestamp: meta?.timestamp ? new Date(meta.timestamp) : last.timestamp
                    };
                }
                return copy;
            });
        };

        try {
            const res = await fetch(`${API_BASE}/chat/ai-chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: finalMessage })
            });

            if (!res.ok || !res.body) throw new Error('stream-unavailable');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let erroredBeforeToken = false;
            let stop = false;

            while (!stop) {
                const { value, done: streamDone } = await reader.read();
                if (streamDone) break;
                buffer += decoder.decode(value, { stream: true });

                // SSE events are separated by a blank line; keep any trailing partial.
                const blocks = buffer.split('\n\n');
                buffer = blocks.pop() || '';

                for (const block of blocks) {
                    let eventName = 'message';
                    let dataStr = '';
                    for (const rawLine of block.split('\n')) {
                        const line = rawLine.replace(/\r$/, '');
                        if (line.startsWith('event:')) eventName = line.slice(6).trim();
                        else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
                    }
                    if (!dataStr) continue;

                    let data: any;
                    try { data = JSON.parse(dataStr); } catch { continue; }

                    if (eventName === 'token' && typeof data.c === 'string') {
                        onToken(data.c);
                    } else if (eventName === 'done') {
                        doneMeta = data;
                        stop = true;
                    } else if (eventName === 'error') {
                        if (!receivedToken) erroredBeforeToken = true;
                        stop = true;
                    }
                }
            }

            // We stop reading on the done/error event without draining to the stream's
            // close, so release the connection explicitly (avoids a benign
            // ERR_INCOMPLETE_CHUNKED_ENCODING in devtools).
            try { await reader.cancel(); } catch { /* already closed */ }

            // Let the typewriter finish revealing what arrived, then clear the streaming flag.
            streamEnded = true;
            if (revealPromise) await revealPromise;
            if (placeholderAdded) finalize(doneMeta);

            // Server signalled failure before producing anything → fall back.
            if (erroredBeforeToken && !receivedToken) throw new Error('stream-error');
        } catch (err) {
            streamEnded = true; // unblock any running reveal loop
            // Only fall back when nothing was rendered; a mid-stream drop keeps partial text.
            if (!receivedToken) await sendBlocking(finalMessage, hasOcr);
            else if (placeholderAdded) finalize(doneMeta);
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
