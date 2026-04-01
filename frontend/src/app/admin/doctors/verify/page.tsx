"use client";
import { useState, useEffect } from 'react';
import { UserCheck, FileBadge, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';

export default function DoctorVerificationPage() {
    const [verifications, setVerifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchVerifications = async () => {
        try {
            const res = await api.get('/admin/doctors/verify');
            setVerifications(res.data.filter((v: any) => v.status === 'PENDING'));
        } catch (err) {
            console.error("Failed to fetch pending verifications", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVerifications();
    }, []);

    const handleAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
        try {
            await api.put(`/admin/doctors/verify/${id}`, { action });
            // Remove the resolved item from the UI queue immediately
            setVerifications(prev => prev.filter(v => v.id !== id));
            // Or re-fetch: fetchVerifications();
        } catch (err) {
            console.error(`Failed to ${action} verification`, err);
            alert(`Error: Unable to ${action} doctor.`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Identity Verification Queue</h1>
                <p className="text-slate-400 mt-2 font-medium">Review and strictly authorize pending medical professionals.</p>
            </div>

            {verifications.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-teal-50 text-teal-500 rounded-full flex flex-col items-center justify-center mb-6 shadow-inner border border-teal-100">
                        <UserCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-secondary mb-2">Zero Pending Verifications</h2>
                    <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                        All submitted specialist credentials have been evaluated and authorized. The network pipeline is currently fully processed!
                    </p>
                    <button onClick={fetchVerifications} className="mt-8 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-secondary font-bold rounded-xl border border-slate-200 transition-colors shadow-sm">
                        Refresh Queue
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {verifications.map((v) => (
                        <div key={v.id} className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 group hover:shadow-lg transition-all">
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-primary border border-slate-100 shrink-0 shadow-sm relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-8 h-8 bg-teal-500/10 rounded-bl-full"></div>
                                     <FileBadge size={28} className="relative z-10" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-secondary flex items-center gap-2">
                                        Dr. {v.doctor.fullName || v.doctor.username}
                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pending</span>
                                    </h3>
                                    <p className="text-slate-500 font-medium text-sm mt-1">{v.doctor.email}</p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                            <span className="text-slate-400">License:</span> {v.licenseNumber}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                            <span className="text-slate-400">Specialty:</span> {v.specialty}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button 
                                    onClick={() => handleAction(v.id, 'REJECT')}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 transition-colors"
                                >
                                    <XCircle size={18} />
                                    Reject
                                </button>
                                <button 
                                    onClick={() => handleAction(v.id, 'APPROVE')}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-teal-600 bg-teal-50 hover:bg-teal-500 hover:text-white border border-teal-100 transition-colors"
                                >
                                    <CheckCircle size={18} />
                                    Approve License
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
