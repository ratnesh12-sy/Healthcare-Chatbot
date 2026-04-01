"use client";
import { useAuth } from '@/context/AuthContext';
import { User, Camera, Mail, ShieldCheck, Settings, Bell, Calendar, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
    const { user } = useAuth();
    
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Your Profile</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your personal information and preferences.</p>
                </div>
                <button className="px-5 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-teal-600 transition-all shadow-sm">
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Avatar & Quick Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-surface"></div>
                        
                        <div className="relative mt-8 mb-4">
                            <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white relative z-10">
                                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                            </div>
                            <button className="absolute bottom-1 right-1 bg-white p-2.5 rounded-full shadow-md text-slate-600 hover:text-primary transition-colors border border-slate-100 z-20">
                                <Camera size={18} />
                            </button>
                        </div>
                        
                        <h2 className="text-xl font-extrabold text-secondary">{user?.fullName || user?.username}</h2>
                        <p className="text-slate-500 font-medium capitalize mt-1">{user?.roles?.[0]?.replace('ROLE_', '').toLowerCase() || 'Patient'}</p>
                        
                        <div className="mt-6 w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-xl text-sm font-bold border border-green-100">
                            <ShieldCheck size={16} />
                            Verified Account
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                        <h3 className="text-lg font-bold text-secondary mb-4">Quick Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3 text-slate-600 font-medium">
                                    <Calendar className="text-blue-500 w-5 h-5" />
                                    Appointments
                                </div>
                                <span className="font-extrabold text-secondary">15</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3 text-slate-600 font-medium">
                                    <Activity className="text-red-500 w-5 h-5" />
                                    Health Score
                                </div>
                                <span className="font-extrabold text-green-500">92/100</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Settings */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
                        <h3 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
                            <User className="text-primary w-6 h-6" />
                            Personal Information
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Full Name</label>
                                <input 
                                    defaultValue={user?.fullName || ''}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Username</label>
                                <input 
                                    defaultValue={user?.username || ''}
                                    disabled
                                    className="w-full p-3.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-400 font-medium cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-500">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                                    <input 
                                        type="email"
                                        defaultValue={user?.email || ''}
                                        className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Phone</label>
                                <input 
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Date of Birth</label>
                                <input 
                                    type="date"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Settings Segment */}
                    <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
                        <h3 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
                            <Settings className="text-primary w-6 h-6" />
                            Account Settings
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                <div>
                                    <h4 className="font-bold text-secondary">Email Notifications</h4>
                                    <p className="text-sm text-slate-500 font-medium">Receive updates about appointments</p>
                                </div>
                                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm"></div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                <div>
                                    <h4 className="font-bold text-secondary">Two-Factor Authentication</h4>
                                    <p className="text-sm text-slate-500 font-medium">Secure your account</p>
                                </div>
                                <button className="px-4 py-1.5 text-sm font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                                    Setup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
