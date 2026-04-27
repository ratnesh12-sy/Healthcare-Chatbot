"use client";
import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Stethoscope, Upload, FileText, Image, X, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(file: File) {
    if (file.type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <Image className="w-5 h-5 text-blue-500" />;
}

export default function DoctorOnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Determine which step to show based on user state
    const isProfileDone = !!user?.profileComplete;
    const hasSubmittedVerification = !!user?.verificationStatus;

    const [formData, setFormData] = useState({
        specialization: '',
        experience: '',
        licenseNumber: '',
        bio: ''
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Only redirect if BOTH profile is complete AND verification is submitted
        if (isProfileDone && hasSubmittedVerification) {
            router.push('/dashboard');
        }
    }, [user, router, isProfileDone, hasSubmittedVerification]);

    const validateFile = (file: File): string | null => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return 'Invalid file type. Only PDF, JPG, and PNG files are allowed.';
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File is too large (${formatFileSize(file.size)}). Maximum size is 5 MB.`;
        }
        if (file.size === 0) {
            return 'File appears to be empty. Please select a valid document.';
        }
        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileError('');

        if (!file) {
            setSelectedFile(null);
            return;
        }

        const validationError = validateFile(file);
        if (validationError) {
            setFileError(validationError);
            setSelectedFile(null);
            toast.error(validationError);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedFile(file);
    };

    const clearFile = () => {
        setSelectedFile(null);
        setFileError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Full onboarding: profile + optional verification
    const handleFullSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Step 1: Create doctor profile
            await api.post('/doctor/profile', {
                specialization: formData.specialization,
                experience: parseInt(formData.experience),
                licenseNumber: formData.licenseNumber,
                bio: formData.bio
            });

            // Step 2: Submit verification with document (if file selected)
            if (selectedFile) {
                const verifyFormData = new FormData();
                verifyFormData.append('licenseNumber', formData.licenseNumber);
                verifyFormData.append('specialty', formData.specialization);
                verifyFormData.append('document', selectedFile);

                await api.post('/doctors/verify', verifyFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Profile completed & verification submitted!');
            } else {
                toast.success('Profile completed! You can submit verification later.');
            }

            window.location.href = '/dashboard';
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to complete profile';
            setError(msg);
            toast.error(msg);
            setLoading(false);
        }
    };

    // Verification-only: profile already done, just submit document
    const handleVerificationOnly = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error('Please select a document to upload');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const verifyFormData = new FormData();
            // Use existing profile data from the user's doctor record
            verifyFormData.append('licenseNumber', formData.licenseNumber || 'PENDING');
            verifyFormData.append('specialty', formData.specialization || 'General');
            verifyFormData.append('document', selectedFile);

            await api.post('/doctors/verify', verifyFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Verification submitted successfully!');
            window.location.href = '/dashboard';
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit verification';
            setError(msg);
            toast.error(msg);
            setLoading(false);
        }
    };

    // ── Verification-Only View (profile already complete) ──
    if (isProfileDone && !hasSubmittedVerification) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
                <Toaster position="top-right" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-xl w-full bg-white p-10 rounded-3xl shadow-2xl"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-6 shadow-lg shadow-amber-500/10">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Submit Verification</h2>
                        <p className="text-slate-500 mt-2">Your profile is complete. Upload your license document to get verified.</p>
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

                    <form onSubmit={handleVerificationOnly} className="space-y-5">
                        {/* License Number (pre-fill if coming back) */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                                Medical License No. <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.licenseNumber}
                                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
                                placeholder="e.g. MED123456"
                                required
                            />
                        </div>

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

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                                License Document <span className="text-red-500">*</span>
                                <span className="text-slate-400 font-normal"> (PDF, JPG, PNG — max 5MB)</span>
                            </label>

                            {!selectedFile ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                        fileError
                                            ? 'border-red-300 bg-red-50/50 hover:border-red-400'
                                            : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30'
                                    }`}
                                >
                                    <Upload className={`w-8 h-8 mx-auto mb-2 ${fileError ? 'text-red-400' : 'text-slate-400'}`} />
                                    <p className="text-sm font-semibold text-slate-600">Click to upload document</p>
                                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, or PNG up to 5MB</p>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4"
                                >
                                    {getFileIcon(selectedFile)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 truncate">{selectedFile.name}</p>
                                        <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove file"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {fileError && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="flex items-center gap-1.5 mt-2 text-xs text-red-600 font-medium">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    {fileError}
                                </motion.div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!selectedFile || !formData.licenseNumber || !formData.specialization || loading}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 mt-6 rounded-xl transition-all shadow-md shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Uploading...' : 'Submit Verification'}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    // ── Full Onboarding View (profile not complete) ──
    const canSubmit = formData.specialization && formData.experience && formData.licenseNumber && !loading;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
            <Toaster position="top-right" />
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

                <form onSubmit={handleFullSubmit} className="space-y-5">
                    <div className="relative">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Specialization <span className="text-red-500">*</span></label>
                        <select
                            value={formData.specialization}
                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer pr-10"
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
                        <div className="pointer-events-none absolute right-3 top-[38px] text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
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

                    {/* Document Upload Section */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                            Verification Document <span className="text-slate-400 font-normal">(PDF, JPG, PNG — max 5MB)</span>
                        </label>

                        {!selectedFile ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                    fileError
                                        ? 'border-red-300 bg-red-50/50 hover:border-red-400'
                                        : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30'
                                }`}
                            >
                                <Upload className={`w-8 h-8 mx-auto mb-2 ${fileError ? 'text-red-400' : 'text-slate-400'}`} />
                                <p className="text-sm font-semibold text-slate-600">Click to upload document</p>
                                <p className="text-xs text-slate-400 mt-1">PDF, JPG, or PNG up to 5MB</p>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4"
                            >
                                {getFileIcon(selectedFile)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-700 truncate">{selectedFile.name}</p>
                                    <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearFile}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove file"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {fileError && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex items-center gap-1.5 mt-2 text-xs text-red-600 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {fileError}
                            </motion.div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 mt-6 rounded-xl transition-all shadow-md shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Uploading...' : 'Complete Registration'}
                    </button>
                    {!canSubmit && !loading && (
                        <p className="text-xs text-amber-600 font-medium text-center mt-2">
                            {!formData.specialization ? '⚠ Please select a specialization' :
                             !formData.experience ? '⚠ Please enter years of experience' :
                             !formData.licenseNumber ? '⚠ Please enter your license number' : ''}
                        </p>
                    )}
                </form>
            </motion.div>
        </div>
    );
}
