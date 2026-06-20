"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, CheckCircle, Clock, X, Activity, ChevronRight, AlertCircle, ShieldCheck, ShieldAlert, ShieldX, Lock } from 'lucide-react';
import { DoctorService, DashboardStats, DoctorAppointmentDTO, DoctorProfileDTO } from '@/lib/doctorService';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import DoctorAvailability from './DoctorAvailability';

// Verification states the dashboard can be in
type VerificationState = 'not_submitted' | 'pending' | 'rejected' | null;

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfileDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointmentDTO | null>(null);
    const [activeMainTab, setActiveMainTab] = useState<'overview' | 'availability'>('overview');
    const router = useRouter();

    // Granular verification tracking instead of a single boolean
    const [verificationState, setVerificationState] = useState<VerificationState>(null);

    // Time-aware greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    const isVerified = verificationState === null && stats !== null;

    const loadData = async () => {
        try {
            setLoading(true);

            // Step 1: Always fetch profile (no verification guard on this endpoint)
            const profile = await DoctorService.getDoctorProfile().catch(() => null);
            setDoctorProfile(profile);

            // Step 2: Try to fetch dashboard stats (has verification guard)
            try {
                const data = await DoctorService.getDashboardStats();
                if (!data) {
                    // Successful response but no payload — show an error instead of a
                    // half-rendered dashboard (only the welcome hero would otherwise show).
                    setError("Failed to load your dashboard. Please try again later.");
                    return;
                }
                setStats(data);
                setVerificationState(null); // Verified — full access
                setError(null);
            } catch (statsErr: any) {
                if (statsErr.response?.status === 403 && statsErr.response?.data?.error === 'PROFILE_INCOMPLETE') {
                    router.push('/doctor/onboarding');
                    return;
                }
                if (statsErr.response?.data?.error === 'DOCTOR_NOT_VERIFIED') {
                    // Determine granular state from user context or profile
                    const vStatus = user?.verificationStatus || profile?.verificationStatus;
                    if (vStatus === 'REJECTED') {
                        setVerificationState('rejected');
                    } else if (vStatus === 'PENDING') {
                        setVerificationState('pending');
                    } else {
                        // null or undefined = never submitted
                        setVerificationState('not_submitted');
                    }
                    setStats(null);
                    setError(null);
                    return;
                }
                // Some other error
                setError("Failed to load your dashboard. Please try again later.");
            }
        } catch (err: any) {
            console.error("Failed to load doctor dashboard", err);
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
        let interval = setInterval(loadData, 30000);

        // Pause polling when tab is backgrounded to save bandwidth
        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(interval);
            } else {
                loadData(); // Refresh immediately on tab focus
                interval = setInterval(loadData, 30000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
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

    // ── Error state ──
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <X className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-secondary mb-2">Oops! Something went wrong.</h2>
                <p className="text-muted mb-6">{error}</p>
                <button onClick={loadData} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    // Find next upcoming appointment (only when verified)
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

    // ── Verification banner config ──
    const verificationBannerConfig: Record<string, {
        icon: React.ReactNode;
        title: string;
        description: string;
        actionLabel: string;
        actionHref: string | null;
        gradient: string;
        borderColor: string;
        iconBg: string;
        titleColor: string;
        textColor: string;
        buttonBg: string;
        buttonHover: string;
    }> = {
        not_submitted: {
            icon: <ShieldAlert className="w-7 h-7 text-amber-600" />,
            title: 'Verification Required',
            description: 'Submit your professional credentials to unlock your full dashboard — manage appointments, set availability, and start seeing patients.',
            actionLabel: 'Submit Verification',
            actionHref: '/doctor/onboarding',
            gradient: 'from-amber-50 via-orange-50 to-yellow-50',
            borderColor: 'border-amber-200',
            iconBg: 'bg-amber-100',
            titleColor: 'text-amber-900',
            textColor: 'text-amber-700',
            buttonBg: 'bg-amber-500',
            buttonHover: 'hover:bg-amber-600',
        },
        pending: {
            icon: <ShieldCheck className="w-7 h-7 text-blue-600" />,
            title: 'Verification Under Review',
            description: 'Your professional credentials are being reviewed by our admin team. You\'ll get full access once your identity is verified. This usually takes less than 24 hours.',
            actionLabel: 'Check Status',
            actionHref: null, // triggers reload
            gradient: 'from-blue-50 via-primary-soft to-sky-50',
            borderColor: 'border-blue-200',
            iconBg: 'bg-blue-100',
            titleColor: 'text-blue-900',
            textColor: 'text-blue-700',
            buttonBg: 'bg-blue-500',
            buttonHover: 'hover:bg-blue-600',
        },
        rejected: {
            icon: <ShieldX className="w-7 h-7 text-red-600" />,
            title: 'Verification Not Approved',
            description: 'Your previous verification submission was not approved. Please review your credentials and resubmit for another review.',
            actionLabel: 'Resubmit Verification',
            actionHref: '/doctor/onboarding',
            gradient: 'from-red-50 via-rose-50 to-pink-50',
            borderColor: 'border-red-200',
            iconBg: 'bg-red-100',
            titleColor: 'text-red-900',
            textColor: 'text-red-700',
            buttonBg: 'bg-red-500',
            buttonHover: 'hover:bg-red-600',
        },
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <Toaster position="top-right" />
            
            {/* === GRADIENT WELCOME HERO === */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#3B3650] via-[#2E2A3F] to-[#241d45] rounded-3xl p-8 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">
                            {greeting}, Dr. {user?.fullName?.split(' ')[0] || user?.username} 👋
                        </h1>
                        <p className="text-white/50 mt-2 font-medium">
                            {doctorProfile?.specialization && (
                                <span className="text-white/70">{doctorProfile.specialization} • </span>
                            )}
                            {todayDate}
                        </p>
                    </div>
                    {/* Only show tabs when verified */}
                    {isVerified && (
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
                    )}
                </div>
            </motion.div>

            {/* === VERIFICATION BANNER (shown when NOT verified) === */}
            {verificationState && verificationBannerConfig[verificationState] && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    {(() => {
                        const config = verificationBannerConfig[verificationState];
                        return (
                            <div className={`bg-gradient-to-r ${config.gradient} border ${config.borderColor} rounded-2xl p-6 md:p-8`}>
                                <div className="flex flex-col md:flex-row md:items-center gap-5">
                                    <div className={`p-3.5 ${config.iconBg} rounded-2xl shrink-0 self-start`}>
                                        {config.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`text-lg font-extrabold ${config.titleColor} mb-1`}>{config.title}</h3>
                                        <p className={`${config.textColor} font-medium leading-relaxed text-sm`}>
                                            {config.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={() => {
                                                if (config.actionHref) {
                                                    router.push(config.actionHref);
                                                } else {
                                                    loadData();
                                                }
                                            }}
                                            className={`px-6 py-2.5 ${config.buttonBg} ${config.buttonHover} text-white font-bold text-sm rounded-xl transition-colors shadow-sm`}
                                        >
                                            {config.actionLabel}
                                        </button>
                                        <button
                                            onClick={() => router.push('/dashboard/profile')}
                                            className="px-5 py-2.5 bg-white/80 text-slate-700 font-semibold text-sm rounded-xl hover:bg-white transition-colors border border-line"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </motion.div>
            )}

            {/* === LIMITED DASHBOARD (shown when NOT verified) === */}
            {verificationState && !loading && (
                <>
                    {/* Grayed-out stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {statCards.map((stat, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                key={stat.label}
                                className="bg-white/60 p-5 rounded-2xl shadow-sm border border-line flex items-center justify-between opacity-50 select-none"
                            >
                                <div>
                                    <p className="text-xs text-muted font-semibold mb-1">{stat.label}</p>
                                    <h3 className="text-2xl font-extrabold text-slate-300 tracking-tight">—</h3>
                                </div>
                                <div className={`p-3 rounded-xl bg-slate-50`}>
                                    <Lock className="w-6 h-6 text-slate-300" />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Locked schedule section */}
                    <div className="bg-white rounded-3xl shadow-sm border border-line overflow-hidden opacity-60">
                        <div className="p-6 border-b border-line flex justify-between items-center bg-surface">
                            <h2 className="text-xl font-bold text-muted">Today&apos;s Schedule</h2>
                            <span className="text-sm font-semibold text-muted flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Locked
                            </span>
                        </div>
                        <div className="p-16 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                                <Calendar className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-muted mb-1">Appointments are locked</h3>
                            <p className="text-muted text-sm max-w-md">
                                {verificationState === 'not_submitted'
                                    ? 'Complete your verification to start receiving and managing patient appointments.'
                                    : verificationState === 'pending'
                                    ? 'Your appointments will appear here once your credentials are verified.'
                                    : 'Resubmit your verification to regain access to appointments.'}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* === FULL DASHBOARD (shown when verified) === */}
            {isVerified && (
                <>
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
                                        className="bg-white p-5 rounded-2xl shadow-sm border border-line flex items-center justify-between cursor-pointer transition-shadow hover:shadow-md"
                                    >
                                        <div>
                                            <p className="text-xs text-muted font-semibold mb-1">{stat.label}</p>
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
                                        <div className="bg-gradient-to-r from-primary-soft to-blue-50 border border-primary-soft rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-primary-soft rounded-xl shrink-0">
                                                    <AlertCircle className="w-6 h-6 text-[#5d4bd6]" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-[#5040c0] uppercase tracking-wider mb-1">🔔 Next Up</p>
                                                    <h4 className="text-lg font-extrabold text-slate-800">{nextAppointment.patientName}</h4>
                                                    <p className="text-sm text-[#5040c0] font-semibold mt-1">
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
                                                        className="px-4 py-2 bg-[#5d4bd6] text-white font-semibold text-sm rounded-lg hover:bg-[#5040c0] transition-colors"
                                                    >
                                                        Confirm
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedAppointment(nextAppointment)}
                                                    className="px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-colors border border-line"
                                                >
                                                    Details
                                                </button>
                                            </div>
                                        </div>
                                    ) : (stats?.totalCount || 0) > 0 ? (
                                        <div className="bg-slate-50 border border-line rounded-2xl p-6 text-center">
                                            <p className="text-muted font-medium">🎉 You&apos;re free for the rest of the day!</p>
                                            <p className="text-sm text-muted mt-1">Take a breather or review your schedule.</p>
                                        </div>
                                    ) : null}
                                </motion.div>
                            )}

                            {/* === TIMELINE APPOINTMENT LIST === */}
                            <div className="bg-white rounded-3xl shadow-sm border border-line overflow-hidden">
                                <div className="p-6 border-b border-line flex justify-between items-center bg-surface">
                                    <h2 className="text-xl font-bold text-secondary">Today&apos;s Schedule</h2>
                                    <span className="text-sm font-semibold text-muted flex items-center gap-2">
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
                                        <p className="text-muted">Take a breather, your schedule is clear.</p>
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        <div className="relative">
                                            {/* Vertical timeline line */}
                                            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
                                            
                                            <div className={stats.todayAppointments.length > 3 ? 'space-y-2' : 'space-y-4'}>
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
                                                                className="flex-1 flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 hover:bg-white rounded-xl border border-line hover:border-line hover:shadow-sm transition-all cursor-pointer gap-3"
                                                            >
                                                                <div className="flex items-center gap-4 flex-1">
                                                                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-white text-slate-600 rounded-xl font-bold shrink-0 border border-line">
                                                                        <span className="text-xs font-semibold">
                                                                            {new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-extrabold text-secondary text-lg">{apt.patientName}</h4>
                                                                        {apt.symptomsSummary && apt.symptomsSummary.trim() !== '' && (
                                                                            <p className="text-sm text-muted mt-1 line-clamp-1">{apt.symptomsSummary}</p>
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
                                                <button onClick={() => setSelectedAppointment(null)} className="p-2 text-muted hover:text-slate-600 bg-white rounded-full shadow-sm">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="p-6 space-y-6">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-2xl font-extrabold text-secondary">{selectedAppointment.patientName}</h4>
                                                        <p className="text-muted font-medium">Scheduled for {new Date(selectedAppointment.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
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
                </>
            )}

            {/* Loading state for initial load */}
            {loading && !verificationState && !stats && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-line h-24 animate-pulse">
                                <div className="h-3 w-20 bg-slate-200 rounded mb-3"></div>
                                <div className="h-7 w-12 bg-slate-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-line p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl"></div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
