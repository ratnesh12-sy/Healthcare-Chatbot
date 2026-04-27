"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Calendar, Clock, CalendarCheck, CalendarDays, PlusCircle, X, Loader2, CheckCircle, Activity, ShieldAlert, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { DoctorService } from '@/lib/doctorService';
import BookingPanel from '@/components/booking/BookingPanel';
import toast, { Toaster } from 'react-hot-toast';

interface Doctor {
    id: number;
    specialization: string;
    user: { fullName: string };
}

interface AppointmentDTO {
    id: number;
    doctorName: string;
    doctorSpecialization: string;
    patientName: string;
    appointmentDate: string;
    durationMinutes: number;
    status: string;
    symptomsSummary: string;
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;

const STATUS_STYLES: Record<string, { border: string; badge: string; badgeBg: string }> = {
    PENDING:   { border: 'border-l-4 border-orange-400', badge: 'text-orange-700', badgeBg: 'bg-orange-100' },
    CONFIRMED: { border: 'border-l-4 border-blue-400',   badge: 'text-blue-700',   badgeBg: 'bg-blue-100' },
    COMPLETED: { border: 'border-l-4 border-green-400',  badge: 'text-green-700',  badgeBg: 'bg-green-100' },
    CANCELLED: { border: 'border-l-4 border-red-300',    badge: 'text-red-600',    badgeBg: 'bg-red-100' },
};

const EMPTY_MESSAGES: Record<string, { text: string; icon: React.ReactNode }> = {
    ALL:       { text: 'No appointments scheduled yet.', icon: <Calendar className="w-8 h-8" /> },
    PENDING:   { text: 'No pending requests 🎉 You\'re all caught up!', icon: <CheckCircle className="w-8 h-8" /> },
    CONFIRMED: { text: 'No confirmed appointments at the moment.', icon: <CalendarCheck className="w-8 h-8" /> },
    COMPLETED: { text: 'No completed appointments yet.', icon: <Clock className="w-8 h-8" /> },
    CANCELLED: { text: 'No cancelled appointments.', icon: <X className="w-8 h-8" /> },
};

function getDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDate(appointments: AppointmentDTO[]): Record<string, AppointmentDTO[]> {
    const groups: Record<string, AppointmentDTO[]> = {};
    appointments.forEach(apt => {
        const key = new Date(apt.appointmentDate).toDateString();
        if (!groups[key]) groups[key] = [];
        groups[key].push(apt);
    });
    return groups;
}

export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [activeFilter, setActiveFilter] = useState<string>('ALL');
    const [expandedSymptoms, setExpandedSymptoms] = useState<Set<number>>(new Set());
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDTO | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

    const isPatient = user?.roles?.[0] === 'ROLE_PATIENT';
    const isDoctor = user?.roles?.[0] === 'ROLE_DOCTOR';
    const isDoctorVerified = verificationStatus === 'APPROVED';

    useEffect(() => {
        fetchAppointments();
        if (isPatient) {
            fetchDoctors();
        }
        if (isDoctor) {
            fetchDoctorProfile();
        }
    }, [user, isPatient, isDoctor]);

    const fetchDoctorProfile = async () => {
        try {
            const profile = await DoctorService.getDoctorProfile();
            setVerificationStatus(profile.verificationStatus || null);
        } catch (err: any) {
            // If DOCTOR_NOT_VERIFIED error, the status is not approved
            if (err?.response?.data?.error === 'DOCTOR_NOT_VERIFIED') {
                setVerificationStatus('NOT_VERIFIED');
            }
            console.error('Failed to fetch doctor profile');
        }
    };

    const fetchAppointments = async () => {
        try {
            const endpoint = isPatient ? '/appointments/patient' : '/appointments/doctor';
            const res = await api.get(endpoint);
            const raw = res.data?.data || res.data || [];
            // Doctor endpoint returns paginated { content: [...] }, patient returns plain array
            const list = Array.isArray(raw) ? raw : (raw.content || []);
            setAppointments(list);
        } catch (err: any) {
            // If blocked by verification guard, gracefully handle it
            if (err?.response?.data?.error === 'DOCTOR_NOT_VERIFIED') {
                setAppointments([]);
            } else {
                console.error('Failed to fetch appointments');
            }
        }
    };

    const fetchDoctors = async () => {
        try {
            const res = await api.get('/doctors/all');
            setDoctors(res.data);
        } catch (err) {
            console.error('Failed to fetch doctors');
        }
    };

    const handleCancel = async (appointmentId: number) => {
        if (cancellingId) return;
        setCancellingId(appointmentId);
        setError('');

        try {
            await api.patch(`/appointments/${appointmentId}/cancel`);
            toast.success('❌ Appointment cancelled');
            fetchAppointments();
        } catch (err: any) {
            const status = err?.response?.status;
            const message = err?.response?.data?.message;
            if (status === 403) {
                setError(message || 'You are not authorized to cancel this appointment.');
            } else {
                setError(message || 'Failed to cancel appointment.');
            }
            setTimeout(() => setError(''), 5000);
        } finally {
            setCancellingId(null);
        }
    };

    const handleDoctorUpdateStatus = async (id: number, currentStatus: string, newStatus: string) => {
        if (currentStatus === newStatus) return;
        try {
            const loadingToast = toast.loading('Updating...');
            await DoctorService.updateAppointmentStatus(id, newStatus);
            const msg = newStatus === 'CONFIRMED' ? '✅ Appointment confirmed' :
                        newStatus === 'COMPLETED' ? '✅ Marked as complete' : 'Status updated';
            toast.success(msg, { id: loadingToast });
            fetchAppointments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleDoctorCancel = async (id: number) => {
        const reason = window.prompt("Reason for cancellation?");
        if (reason === null) return;
        try {
            const loadingToast = toast.loading('Cancelling...');
            await DoctorService.updateAppointmentStatus(id, 'CANCELLED', reason || 'No reason provided');
            toast.success('❌ Appointment cancelled', { id: loadingToast });
            fetchAppointments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to cancel');
        }
    };

    const toggleSymptom = (id: number) => {
        setExpandedSymptoms(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Filtering
    const filtered = activeFilter === 'ALL'
        ? appointments
        : appointments.filter(a => a.status === activeFilter);

    const grouped = isDoctor ? groupByDate(filtered) : null;

    const filterCounts = STATUS_FILTERS.reduce((acc, f) => {
        acc[f] = f === 'ALL' ? appointments.length : appointments.filter(a => a.status === f).length;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Toaster position="top-right" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Appointments</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your consultations and schedule effectively.</p>
                </div>
                <div className="flex gap-3">
                    {isPatient && (
                        <button 
                            onClick={() => document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-teal-600 transition-all shadow-sm"
                        >
                            <PlusCircle size={20} />
                            New Booking
                        </button>
                    )}
                </div>
            </div>

            {/* Global Toasts */}
            {success && (
                <div className="bg-green-50/80 border border-green-200 text-green-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    {success}
                </div>
            )}
            {error && (
                <div className="bg-red-50/80 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <X size={14} className="text-red-400" />
                    {error}
                </div>
            )}

            {/* === DOCTOR VERIFICATION BANNER === */}
            {isDoctor && verificationStatus !== 'APPROVED' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`sticky top-0 z-20 rounded-2xl p-5 border shadow-sm ${
                        verificationStatus === null || verificationStatus === 'NOT_VERIFIED'
                            ? 'bg-violet-50 border-violet-200 text-violet-800'
                            : verificationStatus === 'PENDING'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {verificationStatus === null || verificationStatus === 'NOT_VERIFIED' ? (
                            <>
                                <ShieldAlert className="w-6 h-6 shrink-0" />
                                <div>
                                    <p className="font-bold text-base">⚠️ You are not verified yet</p>
                                    <p className="text-sm font-medium mt-0.5 opacity-80">Submit your credentials to start the verification process.</p>
                                </div>
                                <a href="/doctor/onboarding" className="ml-auto px-5 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-sm shrink-0">
                                    Submit Verification
                                </a>
                            </>
                        ) : verificationStatus === 'PENDING' ? (
                            <>
                                <Clock className="w-6 h-6 shrink-0 animate-pulse" />
                                <div>
                                    <p className="font-bold text-base">⏳ Verification under review</p>
                                    <p className="text-sm font-medium mt-0.5 opacity-80">Your credentials are being reviewed by the admin team. You'll be notified once approved.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-6 h-6 shrink-0" />
                                <div>
                                    <p className="font-bold text-base">❌ Verification rejected</p>
                                    <p className="text-sm font-medium mt-0.5 opacity-80">Your verification was not approved. Please review and resubmit your credentials.</p>
                                </div>
                                <a href="/doctor/onboarding" className="ml-auto px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors text-sm shrink-0">
                                    Resubmit
                                </a>
                            </>
                        )}
                    </div>
                </motion.div>
            )}

            {isDoctor && !isDoctorVerified && (
                <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-600">
                    <Lock size={16} className="shrink-0" />
                    <span className="text-sm font-semibold">🔒 Verification required to manage appointments</span>
                </div>
            )}

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <CalendarDays size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500">Upcoming</p>
                        <h3 className="text-3xl font-extrabold text-secondary">{appointments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED').length}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-center gap-5">
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                        <CalendarCheck size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500">Completed</p>
                        <h3 className="text-3xl font-extrabold text-secondary">{appointments.filter(a => a.status === 'COMPLETED').length || 0}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-center gap-5">
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                        <Clock size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500">Total Appointments</p>
                        <h3 className="text-3xl font-extrabold text-secondary">{appointments.length}</h3>
                    </div>
                </div>
            </div>

            {/* === DOCTOR-ONLY: FILTER TABS === */}
            {isDoctor && (
                <div className="flex flex-wrap gap-2">
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                                activeFilter === f
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                                activeFilter === f ? 'bg-white/20' : 'bg-slate-200'
                            }`}>
                                {filterCounts[f]}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Booking Section (Patient only) */}
            {isPatient && (
                <div id="booking-section" className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                        <h2 className="text-xl font-bold text-secondary mb-4 flex items-center gap-2">
                            <CalendarDays className="text-primary w-6 h-6" />
                            Book New Appointment
                        </h2>
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-secondary mb-1.5">Select Doctor</label>
                            <select
                                value={selectedDoctor?.id || ''}
                                onChange={(e) => {
                                    const doc = doctors.find(d => d.id === parseInt(e.target.value));
                                    setSelectedDoctor(doc || null);
                                }}
                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                            >
                                <option value="">Choose a specialist...</option>
                                {doctors.map(doc => (
                                    <option key={doc.id} value={doc.id}>Dr. {doc.user.fullName} ({doc.specialization})</option>
                                ))}
                            </select>
                        </div>
                        {selectedDoctor && (
                            <BookingPanel
                                doctorId={selectedDoctor.id}
                                doctorName={selectedDoctor.user.fullName}
                                maxDays={30}
                                onBookingSuccess={fetchAppointments}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* === APPOINTMENTS LIST === */}
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-secondary">Schedule Overview</h2>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFilter}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                    >
                        {filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 text-slate-300">
                                    {EMPTY_MESSAGES[activeFilter]?.icon || <Calendar className="w-8 h-8" />}
                                </div>
                                <p className="font-medium text-slate-500">
                                    {EMPTY_MESSAGES[activeFilter]?.text || 'No appointments found.'}
                                </p>
                            </div>
                        ) : isDoctor && grouped ? (
                            /* Doctor view: grouped by date */
                            <div>
                                {Object.entries(grouped).map(([dateKey, apts]) => (
                                    <div key={dateKey}>
                                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 px-6 py-2 border-b border-slate-100">
                                            <p className="text-sm font-bold text-slate-500">{getDateLabel(apts[0].appointmentDate)}</p>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {apts.map(apt => (
                                                <AppointmentCard
                                                    key={apt.id}
                                                    apt={apt}
                                                    isPatient={false}
                                                    isDoctor={true}
                                                    isDoctorVerified={isDoctorVerified}
                                                    cancellingId={cancellingId}
                                                    expandedSymptoms={expandedSymptoms}
                                                    onToggleSymptom={toggleSymptom}
                                                    onCancel={handleCancel}
                                                    onDoctorUpdateStatus={handleDoctorUpdateStatus}
                                                    onDoctorCancel={handleDoctorCancel}
                                                    onSelect={setSelectedAppointment}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Patient view: flat list */
                            <div className="divide-y divide-slate-100">
                                {filtered.map(apt => (
                                    <AppointmentCard
                                        key={apt.id}
                                        apt={apt}
                                        isPatient={isPatient}
                                        isDoctor={false}
                                        isDoctorVerified={isDoctorVerified}
                                        cancellingId={cancellingId}
                                        expandedSymptoms={expandedSymptoms}
                                        onToggleSymptom={toggleSymptom}
                                        onCancel={handleCancel}
                                        onDoctorUpdateStatus={handleDoctorUpdateStatus}
                                        onDoctorCancel={handleDoctorCancel}
                                        onSelect={setSelectedAppointment}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* === DETAIL MODAL (Doctor) === */}
            <AnimatePresence>
                {selectedAppointment && isDoctor && (
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
                                    <Activity className="w-5 h-5 text-primary" /> Patient Overview
                                </h3>
                                <button onClick={() => setSelectedAppointment(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-2xl font-extrabold text-secondary">{selectedAppointment.patientName}</h4>
                                        <p className="text-slate-500 font-medium">{new Date(selectedAppointment.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase ${
                                        STATUS_STYLES[selectedAppointment.status]?.badgeBg || 'bg-slate-100'
                                    } ${STATUS_STYLES[selectedAppointment.status]?.badge || 'text-slate-600'}`}>
                                        {selectedAppointment.status}
                                    </span>
                                </div>
                                {selectedAppointment.symptomsSummary && selectedAppointment.symptomsSummary.trim() !== '' && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                                        <h5 className="font-bold text-blue-900 mb-2">🤖 AI Triage Summary</h5>
                                        <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">{selectedAppointment.symptomsSummary}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* === REUSABLE APPOINTMENT CARD === */
function AppointmentCard({
    apt, isPatient, isDoctor, isDoctorVerified = true, cancellingId, expandedSymptoms,
    onToggleSymptom, onCancel, onDoctorUpdateStatus, onDoctorCancel, onSelect
}: {
    apt: AppointmentDTO;
    isPatient: boolean;
    isDoctor: boolean;
    isDoctorVerified?: boolean;
    cancellingId: number | null;
    expandedSymptoms: Set<number>;
    onToggleSymptom: (id: number) => void;
    onCancel: (id: number) => void;
    onDoctorUpdateStatus: (id: number, current: string, next: string) => void;
    onDoctorCancel: (id: number) => void;
    onSelect: (apt: AppointmentDTO) => void;
}) {
    const style = STATUS_STYLES[apt.status] || STATUS_STYLES.PENDING;
    const expanded = expandedSymptoms.has(apt.id);

    return (
        <div
            onClick={isDoctor ? () => onSelect(apt) : undefined}
            className={`p-6 flex flex-col md:flex-row md:items-start justify-between hover:bg-slate-50/50 transition-colors gap-4 ${
                isDoctor ? `${style.border} cursor-pointer` : ''
            }`}
        >
            <div className="flex gap-5">
                <div className="w-16 h-16 bg-surface text-primary rounded-2xl flex flex-col items-center justify-center shadow-sm border border-primary/10 shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider">{new Date(apt.appointmentDate).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-extrabold leading-none mt-1">{new Date(apt.appointmentDate).getDate()}</span>
                </div>
                <div className="flex flex-col justify-center">
                    <h4 className="font-extrabold text-secondary text-lg">
                        {isPatient ? `Dr. ${apt.doctorName}` : apt.patientName}
                    </h4>
                    <p className="text-sm font-medium text-slate-500">{apt.doctorSpecialization}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                            <Clock size={12} />
                            {new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs font-semibold text-slate-400">{apt.durationMinutes} min</span>
                    </div>

                    {/* Conditional symptom preview (doctor only) */}
                    {isDoctor && apt.symptomsSummary && apt.symptomsSummary.trim() !== '' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800"
                        >
                            🤖 {expanded ? apt.symptomsSummary : apt.symptomsSummary.slice(0, 80) + (apt.symptomsSummary.length > 80 ? '...' : '')}
                            {apt.symptomsSummary.length > 80 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleSymptom(apt.id); }}
                                    className="ml-2 text-blue-600 font-semibold hover:underline"
                                >
                                    {expanded ? 'show less' : 'show more'}
                                </button>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2 shrink-0">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                    apt.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' :
                    apt.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    apt.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                    {apt.status}
                </span>

                {/* Patient cancel */}
                {isPatient && apt.status === 'PENDING' && (
                    <button
                        onClick={() => onCancel(apt.id)}
                        disabled={cancellingId === apt.id}
                        className="text-red-500 text-sm font-bold hover:text-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                        {cancellingId === apt.id ? (
                            <><Loader2 size={12} className="animate-spin" /> Cancelling...</>
                        ) : (
                            'Cancel'
                        )}
                    </button>
                )}

                {/* Doctor inline actions */}
                {isDoctor && apt.status === 'PENDING' && (
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDoctorUpdateStatus(apt.id, apt.status, 'CONFIRMED'); }}
                            disabled={!isDoctorVerified}
                            title={!isDoctorVerified ? 'You must be verified to perform this action' : ''}
                            className={`px-3 py-1.5 font-semibold text-xs rounded-lg transition-colors ${isDoctorVerified ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            Confirm
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDoctorCancel(apt.id); }}
                            disabled={!isDoctorVerified}
                            title={!isDoctorVerified ? 'You must be verified to perform this action' : ''}
                            className={`px-3 py-1.5 font-semibold text-xs rounded-lg transition-colors ${isDoctorVerified ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            Decline
                        </button>
                    </div>
                )}
                {isDoctor && apt.status === 'CONFIRMED' && (
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDoctorUpdateStatus(apt.id, apt.status, 'COMPLETED'); }}
                            disabled={!isDoctorVerified}
                            title={!isDoctorVerified ? 'You must be verified to perform this action' : ''}
                            className={`px-3 py-1.5 font-semibold text-xs rounded-lg transition-colors ${isDoctorVerified ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            Complete
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDoctorCancel(apt.id); }}
                            disabled={!isDoctorVerified}
                            title={!isDoctorVerified ? 'You must be verified to perform this action' : ''}
                            className={`px-3 py-1.5 font-semibold text-xs rounded-lg transition-colors ${isDoctorVerified ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
