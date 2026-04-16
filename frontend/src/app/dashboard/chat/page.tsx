"use client";
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Send, Bot, User, Loader2, AlertCircle, Sparkles, Mic, MicOff, Paperclip, X, Lock, ImageIcon, BellPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createWorker, Worker } from 'tesseract.js';
import ReminderModal from '@/components/ReminderModal';

interface Message {
    id?: number;
    message: string;
    isFromAi: boolean;
    timestamp: Date | string;
    isOcrAnalysis?: boolean; // Flag to show medical disclaimer after this AI response
}

// ─── Image Preprocessing Helper ────────────────────────────────────────
// Resizes large images and converts to grayscale for better OCR accuracy
function preprocessImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                // Mobile detection
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                const MAX_SIZE = isMobile ? 1200 : 2000;

                let { width, height } = img;

                // Resize if needed (preserve aspect ratio)
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(file); return; }

                // Draw image
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to grayscale for better OCR
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    data[i] = avg;     // R
                    data[i + 1] = avg; // G
                    data[i + 2] = avg; // B
                }
                ctx.putImageData(imageData, 0, 0);

                canvas.toBlob(
                    (blob) => blob ? resolve(blob) : resolve(file),
                    'image/jpeg',
                    0.85
                );
            } catch {
                resolve(file); // Fallback to original on error
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

// ─── OCR Timeout Constant ──────────────────────────────────────────────
const OCR_TIMEOUT_MS = 15000; // 15 seconds
const MAX_OCR_TEXT_LENGTH = 4000;
const MIN_OCR_TEXT_LENGTH = 20;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // ─── Speech Recognition State ──────────────────────────────────────
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const isListeningRef = useRef(false);
    const lastRestartTimeRef = useRef(0);

    // ─── OCR State ─────────────────────────────────────────────────────
    const [ocrFile, setOcrFile] = useState<File | null>(null);
    const [ocrPreview, setOcrPreview] = useState<string>('');
    const [ocrText, setOcrText] = useState<string>('');
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrError, setOcrError] = useState<string>('');
    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Reminder State ────────────────────────────────────────────────
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [reminderAiText, setReminderAiText] = useState('');

    const openReminder = (text: string) => {
        setReminderAiText(text);
        setIsReminderOpen(true);
    };

    // ─── Speech Recognition Setup ──────────────────────────────────────
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

    // ─── OCR Cleanup on Unmount ────────────────────────────────────────
    useEffect(() => {
        return () => {
            // Terminate Tesseract worker on unmount
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            // Revoke preview URL
            if (ocrPreview) {
                URL.revokeObjectURL(ocrPreview);
            }
        };
    }, []);

    // ─── Get or Create Tesseract Worker (Lazy Singleton) ───────────────
    const getWorker = async (): Promise<Worker> => {
        if (workerRef.current) return workerRef.current;

        const worker = await createWorker('eng', 1, {
            logger: (m: any) => {
                if (m.status === 'recognizing text') {
                    setOcrProgress(Math.round(m.progress * 100));
                }
            }
        });

        workerRef.current = worker;
        return worker;
    };

    // ─── Crash Recovery ────────────────────────────────────────────────
    const destroyWorker = async () => {
        if (workerRef.current) {
            try {
                await workerRef.current.terminate();
            } catch { /* ignore termination errors */ }
            workerRef.current = null;
        }
    };

    // ─── Clear OCR State ───────────────────────────────────────────────
    const clearOcr = () => {
        if (ocrPreview) URL.revokeObjectURL(ocrPreview);
        setOcrFile(null);
        setOcrPreview('');
        setOcrText('');
        setOcrLoading(false);
        setOcrProgress(0);
        setOcrError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Handle File Upload + OCR ──────────────────────────────────────
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset previous state
        clearOcr();

        // 1. File type validation
        if (!ALLOWED_TYPES.includes(file.type)) {
            setOcrError('Only JPG, PNG, or WebP images are supported.');
            setOcrFile(null);
            return;
        }

        // 2. File size validation
        if (file.size > MAX_FILE_SIZE) {
            setOcrError('File is too large. Please upload an image under 10MB.');
            setOcrFile(null);
            return;
        }

        // 3. Set file and preview
        setOcrFile(file);
        setOcrPreview(URL.createObjectURL(file));
        setOcrLoading(true);
        setOcrProgress(0);
        setOcrError('');

        // Mobile large file warning
        const isMobile = window.innerWidth < 768;
        if (isMobile && file.size > 5 * 1024 * 1024) {
            console.warn('Large file on mobile device, processing may be slow');
        }

        try {
            // 4. Preprocess image
            const processedBlob = await preprocessImage(file);

            // 5. Get or create worker
            const worker = await getWorker();

            // 6. Run OCR with timeout (Promise.race)
            const ocrPromise = worker.recognize(processedBlob);
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('OCR_TIMEOUT')), OCR_TIMEOUT_MS)
            );

            const result = await Promise.race([ocrPromise, timeoutPromise]);
            const extractedText = (result as any).data.text.trim();

            // 7. Validate OCR output
            if (extractedText.length < MIN_OCR_TEXT_LENGTH) {
                setOcrError('Could not extract readable text. Please try a clearer image.');
                setOcrText('');
            } else {
                // 8. Trim if too long
                const finalText = extractedText.length > MAX_OCR_TEXT_LENGTH
                    ? extractedText.substring(0, MAX_OCR_TEXT_LENGTH) + '\n[...text truncated for analysis]'
                    : extractedText;
                setOcrText(finalText);
            }
        } catch (err: any) {
            if (err?.message === 'OCR_TIMEOUT') {
                setOcrError('Text extraction took too long. Please try a clearer image.');
            } else {
                setOcrError('Something went wrong. Please try again.');
                console.error('OCR Error:', err);
            }
            // Crash recovery: destroy the worker so next upload creates a fresh one
            await destroyWorker();
        } finally {
            setOcrLoading(false);
        }
    };

    // ─── Chat History ──────────────────────────────────────────────────
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

    // ─── Send Message (with OCR integration) ───────────────────────────
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isListeningRef.current && recognition) {
            recognition.stop();
            setIsListening(false);
            setInterimTranscript('');
        }

        const userTypedMessage = input.trim();
        const hasOcr = ocrText.length > 0;

        if (!userTypedMessage && !hasOcr) return;

        // Build the message to send
        let finalMessage = '';
        if (hasOcr) {
            // Structured AI prompt for medical report analysis
            finalMessage = `📋 Medical Report Analysis Request

Extracted text from uploaded report:
---
${ocrText}
---

${userTypedMessage ? `Additional context from patient: ${userTypedMessage}\n\n` : ''}Please analyze this medical report and provide:
1. **Key Findings** — Identify any abnormal values or noteworthy results
2. **Health Implications** — Explain what these findings may indicate
3. **Suggested Next Steps** — Recommend follow-up tests or lifestyle changes
4. **Consultation Recommendation** — Advise whether the patient should see a specialist

Keep the analysis clear and patient-friendly.`;
        } else {
            finalMessage = userTypedMessage;
        }

        // Display a user-friendly message in the chat
        const displayMessage = hasOcr
            ? `📎 [Uploaded medical report: ${ocrFile?.name}]${userTypedMessage ? `\n${userTypedMessage}` : ''}`
            : userTypedMessage;

        const userMsg: Message = { message: displayMessage, isFromAi: false, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        clearOcr();
        setLoading(true);

        try {
            const res = await api.post('/chat/ai-chat', { message: finalMessage });
            setMessages(prev => [...prev, {
                ...res.data,
                isFromAi: true,
                isOcrAnalysis: hasOcr // Flag so we can show disclaimer
            }]);
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
            <div className="mb-4 md:mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-secondary flex items-center gap-3">
                        <Bot className="text-primary w-7 h-7 md:w-8 md:h-8" />
                        Health AI Assistant
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">Ask questions, check symptoms, or upload a medical report.</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold border border-green-100 shadow-sm">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    AI Online
                </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden flex flex-col relative">
                
                {/* Disclaimer Banner */}
                <div className="bg-orange-50/80 border-b border-orange-100 px-4 md:px-6 py-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs md:text-sm text-orange-800 leading-relaxed font-medium">
                        <span className="font-bold">Medical Disclaimer:</span> This AI assistant provides general informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician for any medical conditions.
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50">
                    
                    {messages.length === 0 && (
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
                                <div className={`flex gap-3 items-end max-w-[85%] md:max-w-[80%] ${msg.isFromAi ? 'flex-row' : 'flex-row-reverse'}`}>
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${msg.isFromAi ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        {msg.isFromAi ? <Bot size={18} /> : <User size={18} />}
                                    </div>
                                    <div>
                                        <div className={msg.isFromAi ? 'chat-bubble-ai border border-slate-200 shadow-sm' : 'chat-bubble-user shadow-soft'}>
                                            <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.message}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className={`text-[10px] font-medium ${msg.isFromAi ? 'text-slate-400' : 'text-white/70'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.isFromAi && (
                                                    <button 
                                                        onClick={() => openReminder(msg.message)}
                                                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                                                    >
                                                        <BellPlus size={12} /> Save as Reminder
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Medical Disclaimer after OCR analysis responses */}
                                        {msg.isFromAi && msg.isOcrAnalysis && (
                                            <div className="ocr-disclaimer">
                                                ⚠️ This analysis is for informational purposes only and is not a medical diagnosis. Always consult a qualified healthcare professional.
                                            </div>
                                        )}
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

                {/* ─── OCR Preview Strip ─────────────────────────────────── */}
                <AnimatePresence>
                    {(ocrFile || ocrError) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100 bg-slate-50 overflow-hidden"
                        >
                            <div className="px-4 md:px-5 py-3">
                                <div className="flex items-start gap-3">
                                    {/* Thumbnail */}
                                    {ocrPreview && (
                                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-white">
                                            <img src={ocrPreview} alt="Report preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    
                                    <div className="flex-1 min-w-0">
                                        {/* File name */}
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            <span className="text-sm font-semibold text-slate-700 truncate">{ocrFile?.name || 'Upload'}</span>
                                        </div>

                                        {/* Progress bar */}
                                        {ocrLoading && (
                                            <div className="mt-2">
                                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full ocr-progress-bar rounded-full transition-all duration-300"
                                                        style={{ width: `${Math.max(ocrProgress, 5)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 font-medium">
                                                    Extracting text... {ocrProgress}%
                                                </p>
                                            </div>
                                        )}

                                        {/* Extracted text preview */}
                                        {ocrText && !ocrLoading && (
                                            <p className="text-xs text-slate-500 mt-1 truncate">
                                                ✅ {ocrText.substring(0, 150)}{ocrText.length > 150 ? '...' : ''}
                                            </p>
                                        )}

                                        {/* Error state */}
                                        {ocrError && (
                                            <p className="text-xs text-red-500 mt-1 font-medium">
                                                ❌ {ocrError}
                                            </p>
                                        )}
                                    </div>

                                    {/* Close button */}
                                    <button 
                                        onClick={clearOcr} 
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Privacy notice */}
                                <div className="ocr-privacy-notice mt-1.5">
                                    <Lock className="w-3 h-3" />
                                    <span>Your report is processed locally in your browser for privacy</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Chat Input Form ───────────────────────────────────── */}
                <form onSubmit={sendMessage} className="p-3 md:p-5 bg-white border-t border-slate-100 flex gap-2 md:gap-4 items-end">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    
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
                            placeholder={ocrText ? "Add notes about your report (optional)..." : "Type or speak your health-related concern..."}
                            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none outline-none resize-none p-3 text-secondary text-sm md:text-base"
                            rows={1}
                        />
                    </div>
                    
                    <div className="flex gap-1.5 md:gap-2">
                        {/* Microphone button */}
                        <button
                            type="button"
                            onClick={toggleListening}
                            disabled={!recognition}
                            title={
                                !recognition ? "Voice input not supported in this browser" 
                                : isListening ? "Stop listening" 
                                : "Start voice typing"
                            }
                            className={`p-3 md:p-4 rounded-2xl transition-all shadow-md flex-shrink-0 ${
                                !recognition 
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    : isListening 
                                        ? 'bg-red-50 text-red-500 border border-red-200 animate-pulse hover:bg-red-100' 
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                            }`}
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>

                        {/* Upload button (📎) */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={ocrLoading}
                            title="Upload medical report image"
                            className={`p-3 md:p-4 rounded-2xl transition-all shadow-md flex-shrink-0 ${
                                ocrLoading
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    : ocrText
                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                            }`}
                        >
                            <Paperclip size={20} />
                        </button>

                        {/* Send button */}
                        <button
                            type="submit"
                            disabled={loading || (!input.trim() && !interimTranscript && !ocrText)}
                            className="bg-primary text-white p-3 md:p-4 rounded-2xl hover:bg-teal-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 flex-shrink-0"
                        >
                            <Send size={20} className={loading ? "animate-pulse" : ""} />
                        </button>
                    </div>
                </form>
            </div>

            <ReminderModal 
                isOpen={isReminderOpen} 
                onClose={() => setIsReminderOpen(false)} 
                aiMessage={reminderAiText} 
            />
        </div>
    );
}
