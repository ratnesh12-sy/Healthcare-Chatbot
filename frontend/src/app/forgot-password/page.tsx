"use client";
import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, MailCheck } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: email.trim() });
        } catch {
            // Intentionally ignored — the response is generic either way (anti-enumeration).
        } finally {
            setLoading(false);
            setSent(true);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 shadow-lg shadow-teal-500/10">
                        {sent ? <MailCheck className="w-8 h-8" /> : <Activity className="w-8 h-8" />}
                    </div>
                    <h2 className="text-3xl font-extrabold text-dark tracking-tight">
                        {sent ? 'Check your email' : 'Forgot password?'}
                    </h2>
                    <p className="text-gray-500 mt-3">
                        {sent
                            ? "If an account with that email exists, we've sent a link to reset your password."
                            : "Enter your email and we'll send you a link to reset your password."}
                    </p>
                </div>

                {sent ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 text-center">
                            Didn't get it? Check your spam folder, or{' '}
                            <button
                                onClick={() => setSent(false)}
                                className="text-primary font-semibold hover:text-teal-600 transition-colors"
                            >
                                try a different email
                            </button>
                            .
                        </p>
                        <Link href="/login" className="block">
                            <button className="w-full btn-primary py-4">Back to sign in</button>
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Send reset link'}
                        </button>
                        <p className="text-center text-gray-600 text-sm">
                            Remember your password?{' '}
                            <Link href="/login" className="text-primary font-bold hover:text-teal-600 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
