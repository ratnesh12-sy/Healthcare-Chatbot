"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Calendar, User, Clock, AlertCircle } from 'lucide-react';
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
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Appointments</h1>
                    <p className="text-gray-500 mt-1">Manage your consultations and schedule.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {isPatient && (
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold mb-6">Book New Appointment</h2>
                            {success && <p className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm font-medium">{success}</p>}
                            <form onSubmit={handleBook} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
                                    <select
                                        value={selectedDoctor}
                                        onChange={(e) => setSelectedDoctor(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    >
                                        <option value="">Choose a specialist...</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id}>Dr. {doc.user.fullName} ({doc.specialization})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Brief Symptoms</label>
                                    <textarea
                                        value={symptoms}
                                        onChange={(e) => setSymptoms(e.target.value)}
                                        rows={3}
                                        placeholder="E.g. Fever, persistent cough..."
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg disabled:opacity-50"
                                >
                                    Confirm Booking
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className={isPatient ? 'lg:col-span-2' : 'lg:col-span-3'}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">Upcoming Appointments</h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {appointments.length === 0 ? (
                                <div className="p-10 text-center text-gray-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    No appointments found.
                                </div>
                            ) : (
                                appointments.map(apt => (
                                    <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex gap-4">
                                            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl h-fit">
                                                <Calendar size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">
                                                    {isPatient ? `Dr. ${apt.doctor.user.fullName}` : apt.patient.fullName}
                                                </h4>
                                                <p className="text-sm text-gray-500">{apt.doctor.specialization}</p>
                                                <div className="flex gap-4 mt-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(apt.appointmentDate).toLocaleString()}</span>
                                                    <span className={`px-2 py-0.5 rounded-full ${apt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                                        apt.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>{apt.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {isPatient && apt.status === 'PENDING' && (
                                            <button className="text-red-500 text-sm font-bold hover:underline">Cancel</button>
                                        )}
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
