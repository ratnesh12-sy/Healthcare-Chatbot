"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, CheckCircle, Clock, Search, X, ChevronRight, Activity } from 'lucide-react';
import { DoctorService, DashboardStats, DoctorAppointmentDTO } from '@/lib/doctorService';
import toast, { Toaster } from 'react-hot-toast';

import DoctorAvailability from './DoctorAvailability';

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointmentDTO | null>(null);
    const [activeMainTab, setActiveMainTab] = useState<'overview' | 'availability'>('overview');

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await DoctorService.getDashboardStats();
            setStats(data);
            setError(null);
        } catch (err) {
            console.error("Failed to load doctor dashboard stats", err);
            setError("Failed to load your dashboard. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    const handleUpdateStatus = async (id: number, currentStatus: string, newStatus: string) => {
        if (currentStatus === newStatus) return;
        
        try {
            const loadingToast = toast.loading('Updating status...');
            await DoctorService.updateAppointmentStatus(id, newStatus);
            toast.success('Appointment updated successfully', { id: loadingToast });
            loadData(); // Refetch
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleCancel = async (id: number) => {
        const reason = window.prompt("Reason for cancellation?");
        if (reason === null) return; // User cancelled prompt
        
        try {
            const loadingToast = toast.loading('Cancelling appointment...');
            await DoctorService.updateAppointmentStatus(id, 'CANCELLED', reason || 'No reason provided');
            toast.success('Appointment cancelled', { id: loadingToast });
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to cancel appointment');
        }
    };

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

    const statCards = [
        { label: "Today's Appointments", value: stats?.todayCount || 0, icon: <Calendar className="w-6 h-6 text-blue-500" />, color: "bg-blue-50" },
        { label: "Pending Requests", value: stats?.pendingCount || 0, icon: <Clock className="w-6 h-6 text-orange-500" />, color: "bg-orange-50" },
        { label: "Completed", value: stats?.completedCount || 0, icon: <CheckCircle className="w-6 h-6 text-green-500" />, color: "bg-green-50" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <Toaster position="top-right" />
            
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary">Dr. {user?.fullName?.split(' ')[0]}'s Workspace</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your schedule and patient triage.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveMainTab('overview')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeMainTab === 'overview' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Overview
                    </button>
                    <button 
                        onClick={() => setActiveMainTab('availability')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeMainTab === 'availability' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Availability Settings
                    </button>
                </div>
            </header>

            {activeMainTab === 'availability' ? (
                <DoctorAvailability />
            ) : (
                <>
                    {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
                    >
                        <div>
                            <p className="text-sm text-slate-500 font-semibold mb-1">{stat.label}</p>
                            {loading ? (
                                <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
                            ) : (
                                <h3 className="text-3xl font-extrabold text-secondary tracking-tight">{stat.value}</h3>
                            )}
                        </div>
                        <div className={`p-4 rounded-2xl ${stat.color}`}>
                            {stat.icon}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Today's Appointments */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-secondary">Today's Schedule</h2>
                    <span className="text-sm font-semibold text-slate-500">Live Updates Active</span>
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
                    <div className="divide-y divide-slate-100">
                        {stats.todayAppointments.map(apt => (
                            <div key={apt.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-indigo-50 text-indigo-600 rounded-xl font-bold shrink-0">
                                        <span className="text-sm">{new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-secondary text-lg">{apt.patientName}</h4>
                                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">{apt.symptomsSummary}</p>
                                        <div className="mt-2 flex gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                                apt.status === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                                                apt.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-600' :
                                                apt.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                                                'bg-red-100 text-red-600'
                                            }`}>
                                                {apt.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <button 
                                        onClick={() => setSelectedAppointment(apt)}
                                        className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                        View Details
                                    </button>
                                    
                                    {apt.status === 'PENDING' && (
                                        <>
                                            <button 
                                                onClick={() => handleUpdateStatus(apt.id, apt.status, 'CONFIRMED')}
                                                className="px-4 py-2 bg-primary text-white font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors"
                                            >
                                                Confirm
                                            </button>
                                            <button 
                                                onClick={() => handleCancel(apt.id)}
                                                className="px-4 py-2 border border-red-200 text-red-600 font-semibold text-sm rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </>
                                    )}

                                    {apt.status === 'CONFIRMED' && (
                                        <>
                                            <button 
                                                onClick={() => handleUpdateStatus(apt.id, apt.status, 'COMPLETED')}
                                                className="px-4 py-2 bg-green-500 text-white font-semibold text-sm rounded-lg hover:bg-green-600 transition-colors"
                                            >
                                                Mark Complete
                                            </button>
                                            <button 
                                                onClick={() => handleCancel(apt.id)}
                                                className="px-4 py-2 border border-red-200 text-red-600 font-semibold text-sm rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Patient Detail Modal */}
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
                                        selectedAppointment.status === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                                        selectedAppointment.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-600' :
                                        selectedAppointment.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                                        'bg-red-100 text-red-600'
                                    }`}>
                                        {selectedAppointment.status}
                                    </span>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                                    <h5 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                        AI Triage Summary
                                    </h5>
                                    <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
                                        {selectedAppointment.symptomsSummary || "No summary provided by the patient."}
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button disabled className="px-5 py-2.5 bg-slate-100 text-slate-400 font-semibold rounded-xl cursor-not-allowed">
                                        View Full Profile (Coming Soon)
                                    </button>
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
