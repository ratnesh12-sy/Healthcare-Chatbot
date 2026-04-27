"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, CheckCircle, Clock, X, Activity, ChevronRight, AlertCircle } from 'lucide-react';
import { DoctorService, DashboardStats, DoctorAppointmentDTO, DoctorProfileDTO } from '@/lib/doctorService';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import DoctorAvailability from './DoctorAvailability';

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfileDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointmentDTO | null>(null);
    const [activeMainTab, setActiveMainTab] = useState<'overview' | 'availability'>('overview');
    const router = useRouter();

    // Time-aware greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    const [pendingVerification, setPendingVerification] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            setPendingVerification(false);
            const [data, profile] = await Promise.all([
                DoctorService.getDashboardStats(),
                DoctorService.getDoctorProfile().catch(() => null)
            ]);
            setStats(data);
            setDoctorProfile(profile);
            setError(null);
        } catch (err: any) {
            console.error("Failed to load doctor dashboard stats", err);
            if (err.response?.status === 403 && err.response?.data?.error === 'PROFILE_INCOMPLETE') {
                router.push('/doctor/onboarding');
                return;
            }
            if (err.response?.data?.error === 'DOCTOR_NOT_VERIFIED') {
                setPendingVerification(true);
                setError(null);
                return;
            }
            setError("Failed to load your dashboard. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.roles?.includes('ROLE_DOCTOR') && user.profileComplete === false) {
            router.push('/doctor/onboarding');
            return;
        }
        
        loadData();
        const interval = setInterval(loadData, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [user, router]);

    const handleUpdateStatus = async (id: number, currentStatus: string, newStatus: string) => {
        if (currentStatus === newStatus) return;
        
        try {
            const loadingToast = toast.loading('Updating status...');
            await DoctorService.updateAppointmentStatus(id, newStatus);
            const msg = newStatus === 'CONFIRMED' ? '✅ Appointment confirmed' :
                        newStatus === 'COMPLETED' ? '✅ Marked as complete' : 'Status updated';
            toast.success(msg, { id: loadingToast });
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleCancel = async (id: number) => {
        const reason = window.prompt("Reason for cancellation?");
        if (reason === null) return;
        
        try {
            const loadingToast = toast.loading('Cancelling appointment...');
            await DoctorService.updateAppointmentStatus(id, 'CANCELLED', reason || 'No reason provided');
            toast.success('❌ Appointment cancelled', { id: loadingToast });
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to cancel appointment');
        }
    };

    // ── Pending Verification State ──
    if (pendingVerification) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-amber-100">
                    <Clock className="w-12 h-12 text-amber-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-secondary mb-3">Verification In Progress</h2>
                <p className="text-slate-500 max-w-md mb-2 font-medium leading-relaxed">
                    Your professional credentials are currently being reviewed by our admin team.
                    You'll get full access to your dashboard once your identity is verified.
                </p>
                <p className="text-sm text-slate-400 mb-8">This usually takes less than 24 hours.</p>
                <div className="flex gap-3">
                    <button 
                        onClick={loadData} 
                        className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        Check Status
                    </button>
                    <button 
                        onClick={() => router.push('/dashboard/profile')} 
                        className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        View Profile
                    </button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <X className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-secondary mb-2">Oops! Something went wrong.</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={loadData} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    // Find next upcoming appointment
    const now = new Date();
    const nextAppointment = stats?.todayAppointments?.find(apt => {
        const aptTime = new Date(apt.appointmentDate);
        return aptTime > now && (apt.status === 'PENDING' || apt.status === 'CONFIRMED');
    });

    const getCountdown = (dateStr: string) => {
        const diff = new Date(dateStr).getTime() - Date.now();
        if (diff <= 0) return 'Starting now';
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        if (hours > 0) return `in ${hours}h ${mins}m`;
        return `in ${mins} minutes`;
    };

    const statCards = [
        { label: "Today's Appointments", value: stats?.todayCount || 0, icon: <Calendar className="w-6 h-6 text-blue-500" />, color: "bg-blue-50" },
        { label: "Pending Requests", value: stats?.pendingCount || 0, icon: <Clock className="w-6 h-6 text-orange-500" />, color: "bg-orange-50" },
        { label: "Completed", value: stats?.completedCount || 0, icon: <CheckCircle className="w-6 h-6 text-green-500" />, color: "bg-green-50" },
        { label: "Total Patients", value: stats?.totalCount || 0, icon: <Users className="w-6 h-6 text-purple-500" />, color: "bg-purple-50" },
    ];

    const statusConfig: Record<string, { dot: string; badge: string; badgeBg: string }> = {
        PENDING: { dot: 'bg-orange-400', badge: 'text-orange-600', badgeBg: 'bg-orange-100' },
        CONFIRMED: { dot: 'bg-blue-400', badge: 'text-blue-600', badgeBg: 'bg-blue-100' },
        COMPLETED: { dot: 'bg-green-400', badge: 'text-green-600', badgeBg: 'bg-green-100' },
        CANCELLED: { dot: 'bg-red-300', badge: 'text-red-600', badgeBg: 'bg-red-100' },
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <Toaster position="top-right" />
            
            {/* === GRADIENT WELCOME HERO === */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-3xl p-8 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">
                            {greeting}, Dr. {user?.fullName?.split(' ')[0]} 👋
                        </h1>
                        <p className="text-white/50 mt-2 font-medium">
                            {doctorProfile?.specialization && (
                                <span className="text-white/70">{doctorProfile.specialization} • </span>
                            )}
                            {todayDate}
                        </p>
                    </div>
                    <div className="flex bg-white/10 backdrop-blur-sm p-1 rounded-xl border border-white/10">
                        <button 
                            onClick={() => setActiveMainTab('overview')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeMainTab === 'overview' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/60 hover:text-white/90'}`}
                        >
                            Overview
                        </button>
                        <button 
                            onClick={() => setActiveMainTab('availability')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeMainTab === 'availability' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/60 hover:text-white/90'}`}
                        >
                            Availability
                        </button>
                    </div>
                </div>
            </motion.div>

            {activeMainTab === 'availability' ? (
                <DoctorAvailability />
            ) : (
                <>
                    {/* === KPI CARDS (4 columns) === */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {statCards.map((stat, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02 }}
                                transition={{ delay: i * 0.08 }}
                                key={stat.label}
                                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer transition-shadow hover:shadow-md"
                            >
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold mb-1">{stat.label}</p>
                                    {loading ? (
                                        <div className="h-8 w-14 bg-slate-200 animate-pulse rounded"></div>
                                    ) : (
                                        <h3 className="text-2xl font-extrabold text-secondary tracking-tight">{stat.value}</h3>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl ${stat.color}`}>
                                    {stat.icon}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* === NEXT UP CARD === */}
                    {!loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            {nextAppointment ? (
                                <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-teal-100 rounded-xl shrink-0">
                                            <AlertCircle className="w-6 h-6 text-teal-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">🔔 Next Up</p>
                                            <h4 className="text-lg font-extrabold text-slate-800">{nextAppointment.patientName}</h4>
                                            <p className="text-sm text-teal-700 font-semibold mt-1">
                                                {new Date(nextAppointment.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {getCountdown(nextAppointment.appointmentDate)}
                                            </p>
                                            {nextAppointment.symptomsSummary && nextAppointment.symptomsSummary.trim() !== '' && (
                                                <p className="text-sm text-slate-600 mt-2 line-clamp-1">
                                                    🤖 &quot;{nextAppointment.symptomsSummary.slice(0, 100)}&quot;
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {nextAppointment.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleUpdateStatus(nextAppointment.id, nextAppointment.status, 'CONFIRMED')}
                                                className="px-4 py-2 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 transition-colors"
                                            >
                                                Confirm
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setSelectedAppointment(nextAppointment)}
                                            className="px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            ) : (stats?.totalCount || 0) > 0 ? (
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
                                    <p className="text-slate-500 font-medium">🎉 You&apos;re free for the rest of the day!</p>
                                    <p className="text-sm text-slate-400 mt-1">Take a breather or review your schedule.</p>
                                </div>
                            ) : null}
                        </motion.div>
                    )}

                    {/* === TIMELINE APPOINTMENT LIST === */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-bold text-secondary">Today&apos;s Schedule</h2>
                            <span className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Auto-refresh every 30s
                            </span>
                        </div>
                        
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl"></div>
                                ))}
                            </div>
                        ) : !stats?.todayAppointments || stats.todayAppointments.length === 0 ? (
                            <div className="p-16 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                                    <Calendar className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">No appointments today</h3>
                                <p className="text-slate-500">Take a breather, your schedule is clear.</p>
                            </div>
                        ) : (
                            <div className="p-6">
                                <div className="relative">
                                    {/* Vertical timeline line */}
                                    <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
                                    
                                    <div className={`space-y-${stats.todayAppointments.length > 3 ? '2' : '4'}`}>
                                        {stats.todayAppointments.map((apt, idx) => {
                                            const config = statusConfig[apt.status] || statusConfig.PENDING;
                                            return (
                                                <motion.div
                                                    key={apt.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="relative flex gap-5 pl-8"
                                                >
                                                    {/* Timeline dot */}
                                                    <div className={`absolute left-0 top-5 w-[22px] h-[22px] rounded-full border-4 border-white ${config.dot} shadow-sm z-10`} />

                                                    {/* Card */}
                                                    <div
                                                        onClick={() => setSelectedAppointment(apt)}
                                                        className="flex-1 flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 hover:bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer gap-3"
                                                    >
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-white text-slate-600 rounded-xl font-bold shrink-0 border border-slate-200">
                                                                <span className="text-xs font-semibold">
                                                                    {new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-extrabold text-secondary text-lg">{apt.patientName}</h4>
                                                                {apt.symptomsSummary && apt.symptomsSummary.trim() !== '' && (
                                                                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{apt.symptomsSummary}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className={`text-xs font-bold px-3 py-1 rounded-md ${config.badgeBg} ${config.badge}`}>
                                                                {apt.status}
                                                            </span>
                                                            
                                                            {apt.status === 'PENDING' && (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(apt.id, apt.status, 'CONFIRMED'); }}
                                                                        className="px-3 py-1.5 bg-primary text-white font-semibold text-xs rounded-lg hover:bg-primary/90 transition-colors"
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleCancel(apt.id); }}
                                                                        className="px-3 py-1.5 border border-red-200 text-red-600 font-semibold text-xs rounded-lg hover:bg-red-50 transition-colors"
                                                                    >
                                                                        Decline
                                                                    </button>
                                                                </>
                                                            )}
                                                            {apt.status === 'CONFIRMED' && (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(apt.id, apt.status, 'COMPLETED'); }}
                                                                        className="px-3 py-1.5 bg-green-500 text-white font-semibold text-xs rounded-lg hover:bg-green-600 transition-colors"
                                                                    >
                                                                        Complete
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleCancel(apt.id); }}
                                                                        className="px-3 py-1.5 border border-red-200 text-red-600 font-semibold text-xs rounded-lg hover:bg-red-50 transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* === PATIENT DETAIL MODAL === */}
                    <AnimatePresence>
                        {selectedAppointment && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                    onClick={() => setSelectedAppointment(null)}
                                />
                                <motion.div 
                                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                                    className="bg-white rounded-3xl w-full max-w-2xl relative z-10 shadow-xl overflow-hidden"
                                >
                                    <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                                        <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-primary" /> Patient Triage Overview
                                        </h3>
                                        <button onClick={() => setSelectedAppointment(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-2xl font-extrabold text-secondary">{selectedAppointment.patientName}</h4>
                                                <p className="text-slate-500 font-medium">Scheduled for {new Date(selectedAppointment.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide ${
                                                statusConfig[selectedAppointment.status]?.badgeBg || 'bg-slate-100'
                                            } ${statusConfig[selectedAppointment.status]?.badge || 'text-slate-600'}`}>
                                                {selectedAppointment.status}
                                            </span>
                                        </div>
                                        
                                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                                            <h5 className="font-bold text-blue-900 mb-2">AI Triage Summary</h5>
                                            <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
                                                {selectedAppointment.symptomsSummary || "No summary provided by the patient."}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}
