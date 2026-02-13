"use client";
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Activity, MessageSquare, Calendar, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
    const { user } = useAuth();

    const stats = [
        { label: 'AI Consultations', value: '12', icon: <MessageSquare className="text-blue-500" />, color: 'bg-blue-50' },
        { label: 'Appointments', value: '3', icon: <Calendar className="text-green-500" />, color: 'bg-green-50' },
        { label: 'Health Score', value: '98%', icon: <Activity className="text-red-500" />, color: 'bg-red-50' },
    ];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user?.fullName}!</h1>
                <p className="text-gray-500 mt-1">Here is what's happening with your health today.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
                    >
                        <div className={`p-4 rounded-xl ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/dashboard/chat" className="p-4 bg-blue-50 text-blue-700 rounded-xl font-bold text-center hover:bg-blue-100 transition-colors">
                            Ask AI Assistant
                        </Link>
                        <Link href="/dashboard/appointments" className="p-4 bg-green-50 text-green-700 rounded-xl font-bold text-center hover:bg-green-100 transition-colors">
                            Book Appointment
                        </Link>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4">Upcoming Schedule</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                    <Calendar size={20} className="text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">General Checkup</p>
                                    <p className="text-xs text-gray-500">Tomorrow at 10:00 AM</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-primary">Confirmed</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
