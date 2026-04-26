"use client";
import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Stethoscope } from 'lucide-react';
import api from '@/lib/api';

export default function DoctorOnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    
    const [formData, setFormData] = useState({
        specialization: '',
        experience: '',
        licenseNumber: '',
        bio: ''
    });
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Redirect if already complete
        if (user?.profileComplete) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/doctor/profile', {
                specialization: formData.specialization,
                experience: parseInt(formData.experience),
                licenseNumber: formData.licenseNumber,
                bio: formData.bio
            });
            
            // Force reload to update context (or we could expose a method in context to manually refresh user)
            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to complete profile');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl w-full bg-white p-10 rounded-3xl shadow-2xl"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-lg shadow-blue-500/10">
                        <Stethoscope className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Complete Your Profile</h2>
                    <p className="text-slate-500 mt-2">Before accessing your dashboard, please provide your professional details.</p>
                </div>

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 text-center"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Specialization <span className="text-red-500">*</span></label>
                        <select
                            value={formData.specialization}
                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none appearance-none"
                            required
                        >
                            <option value="" disabled>Select your specialization</option>
                            <option value="Cardiologist">Cardiologist</option>
                            <option value="Dermatologist">Dermatologist</option>
                            <option value="Endocrinologist">Endocrinologist</option>
                            <option value="General Practitioner">General Practitioner</option>
                            <option value="Neurologist">Neurologist</option>
                            <option value="Pediatrician">Pediatrician</option>
                            <option value="Psychiatrist">Psychiatrist</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Years of Experience <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                value={formData.experience}
                                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
                                placeholder="e.g. 5"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Medical License No. <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={formData.licenseNumber}
                                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
                                placeholder="e.g. MED123456"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Professional Bio</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
                            placeholder="Briefly describe your background, expertise, and patient care philosophy..."
                            rows={4}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 mt-6 rounded-xl transition-all shadow-md shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting...' : 'Complete Registration'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
