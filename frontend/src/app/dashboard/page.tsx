"use client";
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Activity, MessageSquare, Calendar, HeartPulse, Flame, Moon } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
    const { user } = useAuth();

    const stats = [
        { label: 'Heart Rate', value: '72 bpm', icon: <HeartPulse className="text-rose-500 w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { label: 'Blood Pressure', value: '120/80', icon: <Activity className="text-primary w-6 h-6" />, color: 'bg-surface text-primary' },
        { label: 'Calories Burned', value: '1,840', icon: <Flame className="text-orange-500 w-6 h-6" />, color: 'bg-orange-50 text-orange-600' },
        { label: 'Sleep Quality', value: '8.5 hrs', icon: <Moon className="text-indigo-500 w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary">Welcome back, {user?.fullName?.split(' ')[0]}! 👋</h1>
                    <p className="text-slate-500 mt-2 font-medium">Here is what's happening with your health today.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-5 py-2.5 bg-white border border-slate-200 text-secondary font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        Download Report
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all"
                    >
                        <div>
                            <p className="text-sm text-slate-500 font-semibold mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-extrabold text-secondary tracking-tight">{stat.value}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                            {stat.icon}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-secondary">Quick Actions</h2>
                        <button className="text-primary text-sm font-semibold hover:underline">View All</button>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <Link href="/dashboard/chat" className="group p-6 bg-surface border border-primary/10 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-primary transition-all duration-300">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-6 h-6 text-primary group-hover:text-teal-600" />
                            </div>
                            <span className="font-bold text-primary group-hover:text-white">Ask AI Assistant</span>
                        </Link>
                        <Link href="/dashboard/appointments" className="group p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-slate-800 transition-all duration-300">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                <Calendar className="w-6 h-6 text-slate-700" />
                            </div>
                            <span className="font-bold text-slate-700 group-hover:text-white">Book Appointment</span>
                        </Link>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-secondary">Upcoming Schedule</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary transition-colors">
                                    <Calendar className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <p className="font-extrabold text-secondary tracking-tight">General Checkup</p>
                                    <p className="text-sm text-slate-500 font-medium mt-0.5">Tomorrow, 10:00 AM</p>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                                Confirmed
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                    <Activity className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <p className="font-extrabold text-secondary tracking-tight">Lab Results</p>
                                    <p className="text-sm text-slate-500 font-medium mt-0.5">Friday, 02:30 PM</p>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-full">
                                Pending
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
