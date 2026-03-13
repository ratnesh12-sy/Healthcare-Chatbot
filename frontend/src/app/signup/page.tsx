"use client";
import React, { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: 'patient'
    });
    const { signup } = useAuth();
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await signup(formData);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to sign up');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl"
            >
                <div className="text-center mb-8">
                    <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-900">Join Us</h2>
                    <p className="text-gray-500 mt-2">Create your healthcare account today</p>
                </div>

                {error && <p className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-center">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="mt-1 block w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="mt-1 block w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="mt-1 block w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="mt-1 block w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">I am a...</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="mt-1 block w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                        >
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="w-full py-4 px-4 bg-primary text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors shadow-lg mt-4"
                    >
                        Create Account
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-600">
                    Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link>
                </p>
            </motion.div>
        </div>
    );
}
