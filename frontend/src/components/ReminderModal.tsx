"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { ReminderService } from "@/lib/reminderService";
import { extractSuggestions } from "@/lib/suggestionExtraction";

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiMessage: string;
}

export default function ReminderModal({ isOpen, onClose, aiMessage }: ReminderModalProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSuggestions(extractSuggestions(aiMessage));
      setText("");
      setError(null);
      setSuccess(false);
      setLoading(false);
      // Autofocus
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, aiMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await ReminderService.add(trimmed, "ai", "one-time");
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      if (err.message === "Storage limit reached") {
        setError("❌ Storage limit reached (Max 50)");
      } else if (err.message === "Reminder already exists") {
        setError("⚠️ Already exists");
      } else {
        setError("❌ Storage unavailable");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        
        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 p-6 z-10"
        >
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3 text-secondary">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <h2 id="modal-title" className="text-xl font-bold">Save Reminder</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-green-600 space-y-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <CheckCircle className="w-12 h-12" />
              </motion.div>
              <p className="font-bold text-lg">✅ Reminder added!</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Reminder Text</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && text.trim() && !loading) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  maxLength={120}
                  placeholder="E.g., Schedule an iron blood test"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-800"
                />
              </div>

              {suggestions.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Suggested from Chat</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setText(suggestion)}
                        className="text-left px-3 py-1.5 bg-indigo-50/50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-sm rounded-lg transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={handleSave}
                  disabled={loading || !text.trim()}
                  aria-label="Save Reminder"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  <Save className="w-4 h-4" />
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
