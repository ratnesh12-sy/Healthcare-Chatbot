import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Paperclip, X, Lock, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createWorker, Worker } from 'tesseract.js';

// ─── Image Preprocessing Helper ────────────────────────────────────────
function preprocessImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                const MAX_SIZE = isMobile ? 1200 : 2000;
                let { width, height } = img;

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

                ctx.drawImage(img, 0, 0, width, height);

                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    data[i] = avg; data[i + 1] = avg; data[i + 2] = avg;
                }
                ctx.putImageData(imageData, 0, 0);

                canvas.toBlob((blob) => blob ? resolve(blob) : resolve(file), 'image/jpeg', 0.85);
            } catch {
                resolve(file);
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

const OCR_TIMEOUT_MS = 15000;
const MAX_OCR_TEXT_LENGTH = 4000;
const MIN_OCR_TEXT_LENGTH = 20;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

import { useChatContext } from '../context/AiChatContext';

export default function ChatInput() {
    const { sendMessage, isTyping } = useChatContext();
    const [input, setInput] = useState('');
    
    // Speech Recognition
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const isListeningRef = useRef(false);
    const lastRestartTimeRef = useRef(0);
    const committedTextRef = useRef('');
    const preListenInputRef = useRef('');

    // OCR
    const [ocrFile, setOcrFile] = useState<File | null>(null);
    const [ocrPreview, setOcrPreview] = useState<string>('');
    const [ocrText, setOcrText] = useState<string>('');
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrError, setOcrError] = useState<string>('');
    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    let allFinalInSession = '';

                    for (let i = 0; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            allFinalInSession += transcript;
                        } else {
                            currentInterim += transcript;
                        }
                    }

                    const fullFinal = (committedTextRef.current + allFinalInSession).trim();
                    const base = preListenInputRef.current.trim();
                    setInput(base ? `${base} ${fullFinal}` : fullFinal);
                    setInterimTranscript(currentInterim);
                };

                speechInstance.onend = () => {
                    if (isListeningRef.current) {
                        setInput((currentInput) => {
                            const base = preListenInputRef.current.trim();
                            const spoken = base ? currentInput.slice(base.length).trim() : currentInput.trim();
                            committedTextRef.current = spoken;
                            return currentInput;
                        });

                        const now = Date.now();
                        if (now - lastRestartTimeRef.current > 500) {
                            try {
                                lastRestartTimeRef.current = now;
                                speechInstance.start();
                            } catch (err) {}
                        }
                    } else {
                        setIsListening(false);
                        setInterimTranscript('');
                    }
                };

                speechInstance.onerror = () => {
                    setIsListening(false);
                    setInterimTranscript('');
                };

                setRecognition(speechInstance);

                return () => {
                    if (speechInstance) speechInstance.stop();
                };
            }
        }
    }, []);

    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (ocrPreview) URL.revokeObjectURL(ocrPreview);
        };
    }, []);

    const toggleListening = () => {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
            setIsListening(false);
            setInterimTranscript('');
            committedTextRef.current = '';
        } else {
            try {
                preListenInputRef.current = input;
                committedTextRef.current = '';
                recognition.start();
                setIsListening(true);
            } catch (err) {}
        }
    };

    const getWorker = async (): Promise<Worker> => {
        if (workerRef.current) return workerRef.current;
        const worker = await createWorker('eng', 1, {
            logger: (m: any) => {
                if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100));
            }
        });
        workerRef.current = worker;
        return worker;
    };

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        clearOcr();

        if (!ALLOWED_TYPES.includes(file.type)) {
            setOcrError('Only JPG, PNG, or WebP images are supported.');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setOcrError('File is too large. Please upload an image under 10MB.');
            return;
        }

        setOcrFile(file);
        setOcrPreview(URL.createObjectURL(file));
        setOcrLoading(true);
        setOcrProgress(0);
        setOcrError('');

        try {
            const processedBlob = await preprocessImage(file);
            const worker = await getWorker();

            const ocrPromise = worker.recognize(processedBlob);
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('OCR_TIMEOUT')), OCR_TIMEOUT_MS)
            );

            const result = await Promise.race([ocrPromise, timeoutPromise]);
            const extractedText = (result as any).data.text.trim();

            if (extractedText.length < MIN_OCR_TEXT_LENGTH) {
                setOcrError('Could not extract readable text. Please try a clearer image.');
                setOcrText('');
            } else {
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
            }
            if (workerRef.current) {
                try { await workerRef.current.terminate(); } catch {}
                workerRef.current = null;
            }
        } finally {
            setOcrLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isListeningRef.current && recognition) {
            recognition.stop();
            setIsListening(false);
            setInterimTranscript('');
        }

        const userTypedMessage = input.trim();
        const hasOcr = ocrText.length > 0;

        if (!userTypedMessage && !hasOcr) return;

        let finalMessage = userTypedMessage;
        if (hasOcr) {
            finalMessage = `📋 Medical Report Analysis Request\n\nExtracted text from uploaded report:\n---\n${ocrText}\n---\n\n${userTypedMessage ? `Additional context from patient: ${userTypedMessage}\n\n` : ''}Please analyze this medical report and provide:\n1. **Key Findings** — Identify any abnormal values or noteworthy results\n2. **Health Implications** — Explain what these findings may indicate\n3. **Suggested Next Steps** — Recommend follow-up tests or lifestyle changes\n4. **Consultation Recommendation** — Advise whether the patient should see a specialist\n\nKeep the analysis clear and patient-friendly.`;
        }

        const displayMessage = hasOcr
            ? `📎 [Uploaded medical report: ${ocrFile?.name}]${userTypedMessage ? `\n${userTypedMessage}` : ''}`
            : userTypedMessage;

        sendMessage(finalMessage, displayMessage, hasOcr);
        setInput('');
        clearOcr();
    };

    return (
        <>
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
                                {ocrPreview && (
                                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-white">
                                        <img src={ocrPreview} alt="Report preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-slate-700 truncate">{ocrFile?.name || 'Upload'}</span>
                                    </div>
                                    {ocrLoading && (
                                        <div className="mt-2">
                                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.max(ocrProgress, 5)}%` }} />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">Extracting text... {ocrProgress}%</p>
                                        </div>
                                    )}
                                    {ocrText && !ocrLoading && (
                                        <p className="text-xs text-slate-500 mt-1 truncate">✅ {ocrText.substring(0, 150)}{ocrText.length > 150 ? '...' : ''}</p>
                                    )}
                                    {ocrError && <p className="text-xs text-red-500 mt-1 font-medium">❌ {ocrError}</p>}
                                </div>
                                <button onClick={clearOcr} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                                <Lock className="w-3 h-3" />
                                <span>Your report is processed locally in your browser for privacy</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="p-3 md:p-5 bg-white border-t border-slate-100 flex gap-2 md:gap-4 items-end">
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
                            if (isListeningRef.current && recognition) toggleListening();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder={ocrText ? "Add notes about your report (optional)..." : "Type or speak your health-related concern..."}
                        className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none outline-none resize-none p-3 text-secondary text-sm md:text-base"
                        rows={1}
                    />
                </div>
                
                <div className="flex gap-1.5 md:gap-2">
                    <button
                        type="button"
                        onClick={toggleListening}
                        disabled={!recognition}
                        title={!recognition ? "Voice input not supported" : isListening ? "Stop listening" : "Start voice typing"}
                        className={`p-3 md:p-4 rounded-2xl transition-all shadow-md flex-shrink-0 ${
                            !recognition ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : isListening ? 'bg-red-50 text-red-500 border border-red-200 animate-pulse hover:bg-red-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                        }`}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={ocrLoading}
                        title="Upload medical report image"
                        className={`p-3 md:p-4 rounded-2xl transition-all shadow-md flex-shrink-0 ${
                            ocrLoading ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : ocrText ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                        }`}
                    >
                        <Paperclip size={20} />
                    </button>

                    <button
                        type="submit"
                        disabled={isTyping || (!input.trim() && !interimTranscript && !ocrText)}
                        className="bg-primary text-white p-3 md:p-4 rounded-2xl hover:bg-teal-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex-shrink-0"
                    >
                        <Send size={20} className={isTyping ? "animate-pulse" : ""} />
                    </button>
                </div>
            </form>
        </>
    );
}
