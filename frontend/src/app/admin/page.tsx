"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Users, UserPlus, FileText, Activity, ShieldAlert } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalDoctors: 0,
        totalAppointments: 0,
        aiQueriesProcessed: 0
    });
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
        fetchLogs();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data);
            setError(null);
        } catch (err) {
            console.error("Failed to load admin stats");
            setError("Couldn't load platform metrics. Please refresh or try again later.");
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await api.get('/admin/audit');
            setAuditLogs(res.data.slice(0, 5)); // Just show recent 5 in dashboard
        } catch (err) {
            console.error("Failed to load audit logs");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Command Center</h1>
                <p className="text-muted mt-2 font-medium">Platform overview and high-level artificial intelligence metrics.</p>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-medium flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button onClick={() => { fetchStats(); fetchLogs(); }} className="px-4 py-1.5 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors shrink-0">
                        Retry
                    </button>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <div className="bg-white p-6 rounded-3xl shadow-soft border border-line flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="w-12 h-12 bg-pastel-sky text-pastel-skyInk rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-sm border border-blue-200">
                        <Users size={24} />
                    </div>
                    <h3 className="text-4xl font-extrabold text-secondary relative z-10">{stats.totalUsers}</h3>
                    <p className="text-sm font-bold text-muted mt-1 relative z-10 uppercase tracking-wider">Total Evaluated Patients</p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-soft border border-line flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-soft rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="w-12 h-12 bg-primary-soft text-[#5d4bd6] rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-sm border border-primary-soft">
                        <UserPlus size={24} />
                    </div>
                    <h3 className="text-4xl font-extrabold text-secondary relative z-10">{stats.totalDoctors}</h3>
                    <p className="text-sm font-bold text-muted mt-1 relative z-10 uppercase tracking-wider">Registered Specialists</p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-soft border border-line flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="w-12 h-12 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-sm border border-purple-200">
                        <FileText size={24} />
                    </div>
                    <h3 className="text-4xl font-extrabold text-secondary relative z-10">{stats.totalAppointments}</h3>
                    <p className="text-sm font-bold text-muted mt-1 relative z-10 uppercase tracking-wider">Platform Appointments</p>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl border flex flex-col relative overflow-hidden group border-rose-500/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 blur-xl"></div>
                    <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-lg border border-rose-400">
                        <Activity size={24} />
                    </div>
                    <div className="flex items-end gap-3 relative z-10">
                        <h3 className="text-4xl font-extrabold text-white">{stats.aiQueriesProcessed}</h3>
                    </div>
                    <p className="text-sm font-bold text-muted mt-1 relative z-10 uppercase tracking-wider">AI API Queries Handled</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Audit Logs Quick View */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-soft border border-line overflow-hidden">
                    <div className="p-6 border-b border-line flex items-center justify-between bg-surface">
                        <h2 className="text-lg font-extrabold text-secondary flex items-center gap-2">
                            <ShieldAlert className="text-primary w-5 h-5" />
                            Recent Security Audit Logs
                        </h2>
                        <Link href="/admin/audit" className="text-sm font-bold text-primary hover:underline">View All</Link>
                    </div>
                    <div className="divide-y divide-line">
                        {auditLogs.length === 0 ? (
                            <div className="p-8 text-center text-muted font-medium">No recent security events logged.</div>
                        ) : (
                            auditLogs.map((log, i) => (
                                <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-secondary text-sm">{log.actionType}</span>
                                        <span className="text-xs text-muted font-medium">{log.details}</span>
                                    </div>
                                    <span className="text-xs font-bold text-muted bg-slate-100 px-3 py-1 rounded-full uppercase">
                                        {new Date(log.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* System Status Panel */}
                <div className="lg:col-span-1 bg-white rounded-3xl shadow-soft border border-line overflow-hidden">
                    <div className="p-6 border-b border-line bg-surface">
                        <h2 className="text-lg font-extrabold text-secondary">Service Health</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-slate-600">Database Connection</span>
                                <span className="text-green-500">Stable</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full w-full"></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-slate-600">Spring Boot API</span>
                                <span className="text-green-500">99.9% Uptime</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full w-full"></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-slate-600">Groq LLM Service</span>
                                <span className="text-amber-500">High Latency</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-amber-400 h-full w-[85%] animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
