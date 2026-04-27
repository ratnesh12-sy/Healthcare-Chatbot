"use client";
import { useState, useEffect } from 'react';
import { UserCheck, FileBadge, CheckCircle, XCircle, X, Eye, Filter, Loader2, FileText, Image as ImageIcon, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Verification {
    id: number;
    doctor: { id: number; fullName: string; username: string; email: string };
    licenseNumber: string;
    specialty: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    submittedAt: string;
    resolvedAt: string | null;
    documentPath: string | null;
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string }> = {
    PENDING:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    REJECTED: { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
};

/** Determine file type badge from the stored path extension */
function getDocTypeBadge(documentPath: string | null) {
    if (!documentPath) return null;
    const ext = documentPath.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
        return { label: 'PDF', icon: <FileText className="w-4 h-4" />, color: 'text-red-600 bg-red-50 border-red-200' };
    }
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) {
        return { label: ext?.toUpperCase(), icon: <ImageIcon className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
    return { label: 'FILE', icon: <FileText className="w-4 h-4" />, color: 'text-slate-600 bg-slate-50 border-slate-200' };
}

export default function DoctorVerificationPage() {
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');
    const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchVerifications = async () => {
        try {
            const res = await api.get('/admin/doctors/verify');
            setVerifications(res.data);
        } catch (err) {
            console.error("Failed to fetch verifications", err);
            toast.error('Failed to load verification data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVerifications();
    }, []);

    const handleAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
        if (actionLoading) return;
        setActionLoading(id);
        try {
            await api.put(`/admin/doctors/verify/${id}`, { action });
            const label = action === 'APPROVE' ? 'approved' : 'rejected';
            toast.success(`Doctor ${label} successfully`);
            setSelectedVerification(null);
            await fetchVerifications();
        } catch (err: any) {
            const msg = err?.response?.data?.message || `Failed to ${action.toLowerCase()} doctor`;
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewDocument = async (verificationId: number) => {
        try {
            const res = await api.get(`/admin/doctors/verify/document/${verificationId}`, {
                responseType: 'blob'
            });

            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');

            // Prevent memory leak — revoke after browser has had time to load it
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        } catch (err) {
            console.error('Document fetch failed:', err);
            toast.error('Failed to load document');
        }
    };

    // Filter + Sort (PENDING first)
    const filtered = verifications
        .filter(v => activeFilter === 'ALL' || v.status === activeFilter)
        .sort((a, b) => {
            if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
            if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
            return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });

    const filterCounts = STATUS_FILTERS.reduce((acc, f) => {
        acc[f] = f === 'ALL' ? verifications.length : verifications.filter(v => v.status === f).length;
        return acc;
    }, {} as Record<string, number>);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Toaster position="top-right" />

            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Identity Verification Queue</h1>
                <p className="text-slate-500 mt-2 font-medium">Review and authorize pending medical professionals.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            activeFilter === f
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Filter size={14} />
                        {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            activeFilter === f ? 'bg-white/20' : 'bg-slate-600'
                        }`}>
                            {filterCounts[f]}
                        </span>
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-teal-50 text-teal-500 rounded-full flex flex-col items-center justify-center mb-6 shadow-inner border border-teal-100">
                        <UserCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-secondary mb-2">
                        {activeFilter === 'ALL' ? 'Zero Verifications' : `No ${activeFilter.toLowerCase()} verifications`}
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                        {activeFilter === 'PENDING'
                            ? 'All submitted credentials have been evaluated. The pipeline is fully processed!'
                            : 'No verification records match the current filter.'
                        }
                    </p>
                    <button onClick={fetchVerifications} className="mt-8 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-secondary font-bold rounded-xl border border-slate-200 transition-colors shadow-sm">
                        Refresh Queue
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filtered.map((v) => {
                        const badge = STATUS_BADGE[v.status] || STATUS_BADGE.PENDING;
                        const docBadge = getDocTypeBadge(v.documentPath);
                        return (
                            <div key={v.id} className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 group hover:shadow-lg transition-all">
                                <div className="flex items-center gap-6 w-full md:w-auto">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-primary border border-slate-100 shrink-0 shadow-sm relative overflow-hidden">
                                         <div className="absolute top-0 right-0 w-8 h-8 bg-teal-500/10 rounded-bl-full"></div>
                                         <FileBadge size={28} className="relative z-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold text-secondary flex items-center gap-2">
                                            Dr. {v.doctor.fullName || v.doctor.username}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}>
                                                {v.status}
                                            </span>
                                        </h3>
                                        <p className="text-slate-500 font-medium text-sm mt-1">{v.doctor.email}</p>
                                        <div className="flex items-center gap-4 mt-3">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                <span className="text-slate-400">License:</span> {v.licenseNumber}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                <span className="text-slate-400">Specialty:</span> {v.specialty}
                                            </div>
                                            {docBadge && (
                                                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${docBadge.color}`}>
                                                    {docBadge.icon}
                                                    {docBadge.label}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {/* View Details Button */}
                                    <button
                                        onClick={() => setSelectedVerification(v)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                                    >
                                        <Eye size={18} />
                                        View Details
                                    </button>
                                    {v.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => handleAction(v.id, 'REJECT')}
                                                disabled={actionLoading === v.id}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading === v.id ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleAction(v.id, 'APPROVE')}
                                                disabled={actionLoading === v.id}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-teal-600 bg-teal-50 hover:bg-teal-500 hover:text-white border border-teal-100 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading === v.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                                Approve
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* View Details Modal */}
            <AnimatePresence>
                {selectedVerification && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setSelectedVerification(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-lg relative z-10 shadow-xl overflow-hidden"
                        >
                            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                                <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
                                    <FileBadge className="w-5 h-5 text-primary" /> Verification Details
                                </h3>
                                <button onClick={() => setSelectedVerification(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-2xl font-extrabold text-secondary">
                                        Dr. {selectedVerification.doctor.fullName || selectedVerification.doctor.username}
                                    </h4>
                                    {(() => {
                                        const badge = STATUS_BADGE[selectedVerification.status] || STATUS_BADGE.PENDING;
                                        return (
                                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase ${badge.bg} ${badge.text} border ${badge.border}`}>
                                                {selectedVerification.status}
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">License Number</p>
                                        <p className="text-lg font-bold text-secondary">{selectedVerification.licenseNumber}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Specialty</p>
                                        <p className="text-lg font-bold text-secondary">{selectedVerification.specialty}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Submission Date</p>
                                        <p className="text-lg font-bold text-secondary">
                                            {selectedVerification.submittedAt
                                                ? new Date(selectedVerification.submittedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Email</p>
                                        <p className="text-lg font-bold text-secondary truncate">{selectedVerification.doctor.email}</p>
                                    </div>
                                </div>

                                {/* ── License Document Section ── */}
                                <div className="border-t border-slate-100 pt-5">
                                    <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">📄 License Document</p>
                                    {selectedVerification.documentPath ? (
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const docBadge = getDocTypeBadge(selectedVerification.documentPath);
                                                return docBadge ? (
                                                    <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${docBadge.color}`}>
                                                        {docBadge.icon}
                                                        {docBadge.label}
                                                    </span>
                                                ) : null;
                                            })()}
                                            <button
                                                onClick={() => handleViewDocument(selectedVerification.id)}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 font-bold text-sm rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                View Document
                                            </button>
                                            <span className="text-xs text-slate-400 ml-1">Opens in new tab</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span className="font-medium">No document uploaded for this verification.</span>
                                        </div>
                                    )}
                                </div>

                                {selectedVerification.status === 'PENDING' && (
                                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => handleAction(selectedVerification.id, 'REJECT')}
                                            disabled={actionLoading === selectedVerification.id}
                                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === selectedVerification.id ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                                            Reject Verification
                                        </button>
                                        <button
                                            onClick={() => handleAction(selectedVerification.id, 'APPROVE')}
                                            disabled={actionLoading === selectedVerification.id}
                                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 border border-teal-400 transition-colors disabled:opacity-50 shadow-sm"
                                        >
                                            {actionLoading === selectedVerification.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                            Approve License
                                        </button>
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
