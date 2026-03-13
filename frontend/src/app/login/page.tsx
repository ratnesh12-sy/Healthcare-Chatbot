"use client";
import React, { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await login(username, password);
        } catch (err: any) {
            setError('Invalid username or password');
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
                    <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                    <p className="text-gray-500 mt-2">Sign in to access your health assistant</p>
                </div>

                {error && <p className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-center">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-4 px-4 bg-primary text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors shadow-lg"
                    >
                        Log In
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-600">
                    Don't have an account? <Link href="/signup" className="text-primary font-bold hover:underline">Sign up</Link>
                </p>
            </motion.div>
        </div>
    );
}
