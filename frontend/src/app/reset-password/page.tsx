"use client";
import React, { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('This reset link is missing its token. Please request a new one.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setDone(true);
            setTimeout(() => router.push('/login'), 2500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="text-center">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 shadow-lg shadow-teal-500/10">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold text-dark tracking-tight">Password updated</h2>
                <p className="text-gray-500 mt-3 mb-8">Your password has been reset. Redirecting you to sign in…</p>
                <Link href="/login" className="block">
                    <button className="w-full btn-primary py-4">Go to sign in</button>
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 shadow-lg shadow-teal-500/10">
                    <Activity className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold text-dark tracking-tight">Set a new password</h2>
                <p className="text-gray-500 mt-3">Choose a strong password for your account.</p>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 flex items-center justify-center gap-2"
                >
                    {error}
                </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">New password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
                            placeholder="••••••••"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label="Toggle password visibility"
                            tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Confirm new password</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="block w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
                        placeholder="••••••••"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Updating...' : 'Update password'}
                </button>
                <p className="text-center text-gray-600 text-sm">
                    <Link href="/login" className="text-primary font-bold hover:text-teal-600 transition-colors">
                        Back to sign in
                    </Link>
                </p>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl"
            >
                <Suspense fallback={<p className="text-center text-gray-500">Loading…</p>}>
                    <ResetPasswordForm />
                </Suspense>
            </motion.div>
        </div>
    );
}
