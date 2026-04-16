"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MessageSquare, Calendar, HeartPulse, Flame, Moon, BellRing, CheckCircle2, Circle, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ReminderService, Reminder } from '@/lib/reminderService';

export default function DashboardHome() {
    const { user } = useAuth();

    const { user } = useAuth();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loaded, setLoaded] = useState(false);

    const loadReminders = async () => {
        try {
            const data = await ReminderService.getAll();
            
            // Deterministic Priority Sorting: Incomplete first, then Newest first
            const sorted = data.sort((a, b) => {
                if (a.isCompleted === b.isCompleted) {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                return a.isCompleted ? 1 : -1;
            });
            
            setReminders(sorted);
        } catch (error) {
            console.error("Failed to fetch reminders:", error);
        } finally {
            setLoaded(true);
        }
    };

    useEffect(() => {
        loadReminders();
        
        const handleUpdate = () => loadReminders();
        window.addEventListener("remindersUpdated", handleUpdate);
        
        return () => window.removeEventListener("remindersUpdated", handleUpdate);
    }, []);

    const toggleReminder = async (id: string, currentStatus: boolean) => {
        // Optimistic UI Update
        setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: !currentStatus } : r));
        
        try {
            await ReminderService.toggle(id);
            // Sorting will naturally trigger again via the window event, pulling it cleanly down.
        } catch (err) {
            // Revert state on failure
            setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: currentStatus } : r));
            console.error("Failed to toggle reminder");
        }
    };

    const deleteReminder = async (id: string) => {
        // Optimistic UI Update
        setReminders(prev => prev.filter(r => r.id !== id));
        try {
            await ReminderService.delete(id);
        } catch (err) {
            loadReminders(); // Revert on failure
            console.error("Failed to delete reminder");
        }
    };

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

                <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <BellRing className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-secondary">My Reminders</h2>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {!loaded ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-slate-100 rounded-2xl w-full"></div>
                                ))}
                            </div>
                        ) : reminders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-slate-100 border-dashed rounded-2xl">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                                    <BellRing className="w-6 h-6 text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-700 mb-1">No reminders yet</h3>
                                <p className="text-xs text-slate-500 mb-4 max-w-[200px]">Save actionable advice directly from your AI consultations.</p>
                                <Link href="/dashboard/chat" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-4 py-2 rounded-lg transition-colors">
                                    Go to Chat <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {reminders.map((reminder) => (
                                    <motion.div
                                        key={reminder.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                                            reminder.isCompleted 
                                                ? 'bg-slate-50 border-slate-100 opacity-60' 
                                                : 'bg-white border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md'
                                        }`}
                                    >
                                        <button 
                                            onClick={() => toggleReminder(reminder.id, reminder.isCompleted)}
                                            className={`mt-0.5 flex-shrink-0 transition-colors ${reminder.isCompleted ? 'text-green-500' : 'text-slate-300 hover:text-indigo-500'}`}
                                            aria-label={reminder.isCompleted ? "Mark incomplete" : "Mark complete"}
                                        >
                                            {reminder.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                        </button>
                                        
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className={`text-sm font-semibold transition-all ${
                                                reminder.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'
                                            }`}>
                                                {reminder.text}
                                            </p>
                                        </div>
                                        
                                        <button 
                                            onClick={() => deleteReminder(reminder.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all flex-shrink-0"
                                            aria-label="Delete reminder"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
