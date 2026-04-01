"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Calendar, User, Clock, AlertCircle, CalendarCheck, CalendarDays, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Doctor {
    id: number;
    specialization: string;
    user: { fullName: string };
}

interface Appointment {
    id: number;
    doctor: Doctor;
    patient: { fullName: string };
    appointmentDate: string;
    status: string;
}

export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [date, setDate] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

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
            setAppointments(res.data);
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

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/appointments/book', {
                doctorId: selectedDoctor,
                appointmentDate: date,
                symptomsSummary: symptoms
            });
            setSuccess('Appointment requested successfully!');
            fetchAppointments();
            // Reset form
            setSelectedDoctor('');
            setDate('');
            setSymptoms('');
        } catch (err) {
            console.error('Failed to book');
        } finally {
            setLoading(false);
        }
    };

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
                        <p className="text-sm font-semibold text-slate-500">Completed (This Month)</p>
                        <h3 className="text-3xl font-extrabold text-secondary">{appointments.filter(a => a.status === 'COMPLETED').length || 0}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-center gap-5">
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                        <Clock size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500">Total Hours</p>
                        <h3 className="text-3xl font-extrabold text-secondary">1.5h</h3>
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
                            {success && (
                                <div className="bg-green-50/80 border border-green-200 text-green-700 p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                                    {success}
                                </div>
                            )}
                            <form onSubmit={handleBook} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-secondary mb-1.5">Select Doctor</label>
                                    <select
                                        value={selectedDoctor}
                                        onChange={(e) => setSelectedDoctor(e.target.value)}
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
                                    <label className="block text-sm font-semibold text-secondary mb-1.5">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                        required
                                    />
                                </div>
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
                                    disabled={loading}
                                    className="w-full py-4 mt-2 bg-primary text-white font-bold rounded-xl hover:bg-teal-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                                >
                                    Confirm Booking
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className={isPatient ? 'lg:col-span-2' : 'lg:col-span-3'}>
                    <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-xl font-bold text-secondary">Schedule Overview</h2>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white border border-slate-200 text-xs font-semibold rounded-full shadow-sm">All</span>
                                <span className="px-3 py-1 bg-transparent text-slate-500 hover:text-secondary text-xs font-semibold rounded-full cursor-pointer transition-colors">Pending</span>
                            </div>
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
                                                    {isPatient ? `Dr. ${apt.doctor.user.fullName}` : apt.patient.fullName}
                                                </h4>
                                                <p className="text-sm font-medium text-slate-500">{apt.doctor.specialization}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-400"><Clock size={12} /> {new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                                                apt.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                apt.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}>
                                                {apt.status}
                                            </span>
                                            {isPatient && apt.status === 'PENDING' && (
                                                <button className="text-red-500 text-sm font-bold hover:text-red-600 transition-colors">Cancel</button>
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
