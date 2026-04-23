"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Calendar, Clock, CalendarCheck, CalendarDays, PlusCircle, X, Loader2 } from 'lucide-react';

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

interface SlotDTO {
    slot: string;     // "09:00", "09:30", etc.
    available: boolean;
}

export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [slots, setSlots] = useState<SlotDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);
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

    // Fetch available slots when doctor + date change
    useEffect(() => {
        if (selectedDoctor && selectedDate) {
            fetchSlots();
        } else {
            setSlots([]);
            setSelectedSlot('');
        }
    }, [selectedDoctor, selectedDate]);

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

    const fetchSlots = useCallback(async () => {
        if (!selectedDoctor || !selectedDate) return;
        setSlotsLoading(true);
        try {
            const res = await api.get('/appointments/available-slots', {
                params: { doctorId: selectedDoctor, date: selectedDate }
            });
            const newSlots: SlotDTO[] = res.data?.data || res.data || [];
            setSlots(newSlots);

            // Auto-deselect if selected slot no longer available
            if (selectedSlot) {
                const stillAvailable = newSlots.find(
                    s => s.slot === selectedSlot && s.available
                );
                if (!stillAvailable) {
                    setSelectedSlot('');
                }
            }
        } catch (err) {
            console.error('Failed to fetch slots');
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    }, [selectedDoctor, selectedDate, selectedSlot]);

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSlot || loading) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Build ISO datetime from date + slot
            const appointmentDate = `${selectedDate}T${selectedSlot}:00`;

            await api.post('/appointments', {
                doctorId: parseInt(selectedDoctor),
                appointmentDate,
                symptomsSummary: symptoms
            });

            setSuccess('Appointment booked successfully!');
            // Post-booking reset
            setSelectedSlot('');
            setSymptoms('');
            fetchAppointments();
            // Refresh slots to remove booked one
            fetchSlots();

            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            const status = err?.response?.status;
            const message = err?.response?.data?.message;

            if (status === 409) {
                setError(message || 'This time slot is already booked. Please choose another.');
                // Auto-refresh slots on conflict
                fetchSlots();
            } else if (status === 400) {
                setError(message || 'Invalid booking request. Please check your inputs.');
            } else {
                setError('Something went wrong. Please try again.');
            }
            setTimeout(() => setError(''), 5000);
        } finally {
            setLoading(false);
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

    // Get minimum selectable date (today)
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Appointments</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your consultations and schedule effectively.</p>
                </div>
                <div className="flex gap-3">
                    {isPatient && (
                        <button 
                            onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {isPatient && (
                    <div id="booking-form" className="lg:col-span-1">
                        <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
                            <h2 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
                                <CalendarDays className="text-primary w-6 h-6" />
                                Book New Appointment
                            </h2>
                            <form onSubmit={handleBook} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-secondary mb-1.5">Select Doctor</label>
                                    <select
                                        value={selectedDoctor}
                                        onChange={(e) => {
                                            setSelectedDoctor(e.target.value);
                                            setSelectedSlot('');
                                        }}
                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                        required
                                    >
                                        <option value="">Choose a specialist...</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id}>Dr. {doc.user.fullName} ({doc.specialization})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-secondary mb-1.5">Select Date</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        min={today}
                                        onChange={(e) => {
                                            setSelectedDate(e.target.value);
                                            setSelectedSlot('');
                                        }}
                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                        required
                                    />
                                </div>

                                {/* Slot Picker */}
                                {selectedDoctor && selectedDate && (
                                    <div>
                                        <label className="block text-sm font-semibold text-secondary mb-2">Available Slots</label>
                                        {slotsLoading ? (
                                            <div className="flex items-center justify-center py-6">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                                <span className="ml-2 text-sm text-slate-500">Loading slots...</span>
                                            </div>
                                        ) : slots.length === 0 ? (
                                            <p className="text-sm text-slate-400 py-4 text-center">No slots available for this date.</p>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-2">
                                                {slots.map((s) => (
                                                    <button
                                                        key={s.slot}
                                                        type="button"
                                                        disabled={!s.available || loading}
                                                        onClick={() => setSelectedSlot(s.slot)}
                                                        className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                                                            !s.available
                                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                                                : selectedSlot === s.slot
                                                                    ? 'bg-primary text-white border-primary shadow-md scale-105'
                                                                    : 'bg-white text-secondary border-slate-200 hover:border-primary hover:text-primary'
                                                        }`}
                                                    >
                                                        {s.slot}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-secondary mb-1.5">Brief Symptoms</label>
                                    <textarea
                                        value={symptoms}
                                        onChange={(e) => setSymptoms(e.target.value)}
                                        rows={3}
                                        placeholder="E.g. Fever, persistent cough..."
                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-secondary"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !selectedSlot}
                                    className="w-full py-4 mt-2 bg-primary text-white font-bold rounded-xl hover:bg-teal-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Booking...
                                        </>
                                    ) : (
                                        'Confirm Booking'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className={isPatient ? 'lg:col-span-2' : 'lg:col-span-3'}>
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
            </div>
        </div>
    );
}
