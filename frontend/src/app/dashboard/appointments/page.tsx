"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Calendar, Clock, CalendarCheck, CalendarDays, PlusCircle, X, Loader2 } from 'lucide-react';
import BookingPanel from '@/components/booking/BookingPanel';
import { Toaster } from 'react-hot-toast';

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

export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const isPatient = user?.roles?.[0] === 'ROLE_PATIENT';

    useEffect(() => {
        fetchAppointments();
        if (isPatient) {
            fetchDoctors();
        }
    }, [user, isPatient]);

    const fetchAppointments = async () => {
        try {
            const endpoint = isPatient ? '/appointments/patient' : '/appointments/doctor';
            const res = await api.get(endpoint);
            setAppointments(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch appointments');
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
            setSuccess('Appointment cancelled successfully.');
            fetchAppointments();
            setTimeout(() => setSuccess(''), 5000);
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

            {/* Booking Section */}
            {isPatient && (
                <div id="booking-section" className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                        <h2 className="text-xl font-bold text-secondary mb-4 flex items-center gap-2">
                            <CalendarDays className="text-primary w-6 h-6" />
                            Book New Appointment
                        </h2>

                        {/* Doctor Selector */}
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

                        {/* BookingPanel renders when doctor is selected */}
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

            {/* Appointments List */}
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-secondary">Schedule Overview</h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {appointments.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Calendar className="w-8 h-8 opacity-40 text-secondary" />
                            </div>
                            <p className="font-medium text-slate-500">No appointments scheduled.</p>
                        </div>
                    ) : (
                        appointments.map(apt => (
                            <div key={apt.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
                                <div className="flex gap-5">
                                    <div className="w-16 h-16 bg-surface text-primary rounded-2xl flex flex-col items-center justify-center shadow-sm border border-primary/10">
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
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                                        apt.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' :
                                        apt.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        apt.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                                        'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                        {apt.status}
                                    </span>
                                    {isPatient && apt.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleCancel(apt.id)}
                                            disabled={cancellingId === apt.id}
                                            className="text-red-500 text-sm font-bold hover:text-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {cancellingId === apt.id ? (
                                                <>
                                                    <Loader2 size={12} className="animate-spin" />
                                                    Cancelling...
                                                </>
                                            ) : (
                                                'Cancel'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
