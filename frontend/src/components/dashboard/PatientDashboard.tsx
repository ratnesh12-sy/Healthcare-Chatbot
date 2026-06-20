"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MessageSquare, Calendar, HeartPulse, Flame, Moon, BellRing, CheckCircle2, Circle, Trash2, ArrowRight, Pill } from 'lucide-react';
import Link from 'next/link';
import { ReminderService, Reminder } from '@/lib/reminderService';
import { HealthMetricService } from '@/lib/healthMetricService';

export default function PatientDashboard() {
    const { user } = useAuth();

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [latestMetrics, setLatestMetrics] = useState<Record<string, string>>({});
    const [spark, setSpark] = useState<Record<string, number[]>>({});

    useEffect(() => {
        HealthMetricService.getLatest()
            .then(list => {
                const map: Record<string, string> = {};
                list.forEach(m => { map[m.type] = m.value; });
                setLatestMetrics(map);
            })
            .catch(() => { /* keep placeholders if unavailable */ });

        // One call for all history → build a mini 7-point trend per vital (systolic for BP).
        HealthMetricService.getHistory()
            .then(list => {
                const byType: Record<string, { t: number; v: number }[]> = {};
                list.forEach(m => {
                    const num = m.type === 'BLOOD_PRESSURE'
                        ? parseInt(m.value.split('/')[0], 10)
                        : parseFloat(m.value);
                    if (!isNaN(num)) (byType[m.type] ||= []).push({ t: new Date(m.recordedAt).getTime(), v: num });
                });
                const out: Record<string, number[]> = {};
                Object.entries(byType).forEach(([k, arr]) => {
                    arr.sort((a, b) => a.t - b.t);
                    out[k] = arr.slice(-8).map(x => x.v);
                });
                setSpark(out);
            })
            .catch(() => { /* sparklines are optional polish */ });
    }, []);

    const metricValue = (type: string, suffix = '') =>
        latestMetrics[type] ? `${latestMetrics[type]}${suffix}` : '—';

    const loadReminders = async () => {
        try {
            const data = await ReminderService.getAll();
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
        setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: !currentStatus } : r));
        try {
            await ReminderService.toggle(id);
        } catch (err) {
            setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: currentStatus } : r));
        }
    };

    const deleteReminder = async (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
        try {
            await ReminderService.delete(id);
        } catch (err) {
            loadReminders();
        }
    };

    const markTaken = async (id: string) => {
        setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: true } : r));
        try {
            await ReminderService.markTaken(id);
        } catch (err) {
            loadReminders();
        }
    };

    const stats = [
        { type: 'HEART_RATE', label: 'Heart Rate', value: metricValue('HEART_RATE', ' bpm'), icon: <HeartPulse className="w-5 h-5" />, chip: 'bg-pastel-rose text-pastel-roseInk', spark: '#F4708A' },
        { type: 'BLOOD_PRESSURE', label: 'Blood Pressure', value: metricValue('BLOOD_PRESSURE'), icon: <Activity className="w-5 h-5" />, chip: 'bg-pastel-sky text-pastel-skyInk', spark: '#4C9AFF' },
        { type: 'CALORIES', label: 'Calories', value: metricValue('CALORIES'), icon: <Flame className="w-5 h-5" />, chip: 'bg-pastel-sun text-pastel-sunInk', spark: '#E0A22E' },
        { type: 'SLEEP_HOURS', label: 'Sleep', value: metricValue('SLEEP_HOURS', ' hrs'), icon: <Moon className="w-5 h-5" />, chip: 'bg-primary-soft text-primary', spark: '#6D5AE6' },
    ];

    const Sparkline = ({ values, color }: { values?: number[]; color: string }) => {
        if (!values || values.length < 2) return <div className="h-[34px]" />;
        const w = 130, h = 34, pad = 3;
        const min = Math.min(...values), max = Math.max(...values);
        const range = max - min || 1;
        const pts = values.map((v, i) => {
            const x = pad + (i / (values.length - 1)) * (w - pad * 2);
            const y = pad + (1 - (v - min) / range) * (h - pad * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return (
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-[34px] mt-3">
                <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary">Welcome back, {user?.fullName?.split(' ')[0]}! 👋</h1>
                    <p className="text-muted mt-2 font-medium">Here is what's happening with your health today.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/health" className="px-5 py-2.5 bg-white border border-line text-secondary font-semibold rounded-xl hover:border-primary/40 hover:text-primary transition-all shadow-sm flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Health Data
                    </Link>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="bg-white p-5 rounded-3xl shadow-soft border border-line group cursor-pointer card-hover"
                    >
                        <div className="flex items-start justify-between">
                            <p className="text-sm text-muted font-semibold">{stat.label}</p>
                            <span className={`chip ${stat.chip} group-hover:scale-110 transition-transform duration-300`}>
                                {stat.icon}
                            </span>
                        </div>
                        <h3 className="text-3xl font-extrabold text-secondary tracking-tight mt-3">{stat.value}</h3>
                        <Sparkline values={spark[stat.type]} color={stat.spark} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="card-soft p-8 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-secondary">Quick Actions</h2>
                        <button className="text-primary text-sm font-semibold hover:underline">View All</button>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <Link href="/dashboard/chat" className="group p-6 bg-primary-soft border border-primary/10 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-primary transition-all duration-300">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-soft-sm group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-6 h-6 text-primary" />
                            </div>
                            <span className="font-bold text-primary group-hover:text-white">Ask AI Assistant</span>
                        </Link>
                        <Link href="/dashboard/appointments" className="group p-6 bg-surface border border-line rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-secondary transition-all duration-300">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-soft-sm group-hover:scale-110 transition-transform">
                                <Calendar className="w-6 h-6 text-secondary" />
                            </div>
                            <span className="font-bold text-secondary group-hover:text-white">Book Appointment</span>
                        </Link>
                    </div>
                </div>

                <div className="card-soft p-8 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-soft text-primary rounded-xl">
                                <BellRing className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-secondary">My Reminders</h2>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {!loaded ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-surface rounded-2xl w-full"></div>
                                ))}
                            </div>
                        ) : reminders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-surface border border-line border-dashed rounded-2xl">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-soft-sm">
                                    <BellRing className="w-6 h-6 text-muted" />
                                </div>
                                <h3 className="font-bold text-secondary mb-1">No reminders yet</h3>
                                <p className="text-xs text-muted mb-4 max-w-[200px]">Save actionable advice directly from your AI consultations.</p>
                                <Link href="/dashboard/chat" className="text-xs font-bold text-primary flex items-center gap-1 bg-primary-soft px-4 py-2 rounded-xl hover:bg-primary hover:text-white transition-colors">
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
                                                ? 'bg-surface border-line opacity-60'
                                                : 'bg-white border-line shadow-soft-sm hover:border-primary/30'
                                        }`}
                                    >
                                        <button
                                            onClick={() => toggleReminder(reminder.id, reminder.isCompleted)}
                                            className={`mt-0.5 flex-shrink-0 transition-colors ${reminder.isCompleted ? 'text-accent' : 'text-slate-300 hover:text-primary'}`}
                                            aria-label={reminder.isCompleted ? "Mark incomplete" : "Mark complete"}
                                        >
                                            {reminder.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                        </button>

                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className={`text-sm font-semibold transition-all ${
                                                reminder.isCompleted ? 'text-muted line-through' : 'text-secondary'
                                            }`}>
                                                {reminder.text}
                                            </p>
                                        </div>

                                        {reminder.category === 'medication' && !reminder.isCompleted && (
                                            <button
                                                onClick={() => markTaken(reminder.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:bg-pastel-mint hover:text-pastel-mintInk rounded-lg transition-all flex-shrink-0"
                                                aria-label="Mark medication taken"
                                                title="Mark as taken"
                                            >
                                                <Pill className="w-4 h-4" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => deleteReminder(reminder.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:bg-red-50 hover:text-red-500 rounded-lg transition-all flex-shrink-0"
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
