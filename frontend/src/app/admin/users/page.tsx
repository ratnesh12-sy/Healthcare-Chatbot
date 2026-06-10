"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Search, UserX, Filter, ArrowUpDown, Ban, CheckCircle2, Eye, X, Mail, Phone, Calendar, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

interface AdminUser {
    id: number;
    username: string;
    email: string;
    fullName: string | null;
    role: string;
    phoneNumber: string | null;
    authProvider: string | null;
    avatarUrl: string | null;
    enabled: boolean;
    createdAt: string | null;
}

const ROLE_FILTERS = [
    { key: 'ALL', label: 'All' },
    { key: 'ROLE_ADMIN', label: 'Admins' },
    { key: 'ROLE_DOCTOR', label: 'Doctors' },
    { key: 'ROLE_PATIENT', label: 'Patients' },
] as const;

const ROLE_BADGE: Record<string, string> = {
    ROLE_ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    ROLE_DOCTOR: 'bg-teal-50 text-teal-700 border-teal-200',
    ROLE_PATIENT: 'bg-blue-50 text-blue-700 border-blue-200',
};

const formatRole = (role: string) =>
    ({ ROLE_ADMIN: 'Administrator', ROLE_DOCTOR: 'Doctor', ROLE_PATIENT: 'Patient' }[role] || role);

const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' } as any) : '—';

// `dim` must be a literal Tailwind class string (e.g. "w-10 h-10") so the JIT compiler picks it up.
function Avatar({ user, dim = 'w-10 h-10' }: { user: AdminUser; dim?: string }) {
    if (user.avatarUrl) {
        // Plain <img> (no next/image domain config needed).
        return (
            <img
                src={user.avatarUrl}
                alt={user.fullName || user.username}
                className={`${dim} rounded-full object-cover bg-slate-200 border border-slate-200`}
            />
        );
    }
    return (
        <div className={`${dim} rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center`}>
            {(user.fullName?.charAt(0) || user.username.charAt(0)).toUpperCase()}
        </div>
    );
}

function AuthBadge({ provider }: { provider: string | null }) {
    const isGoogle = (provider || '').toUpperCase() === 'GOOGLE';
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
            isGoogle ? 'bg-white text-slate-700 border-slate-200' : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
            {isGoogle ? (
                <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
                    </svg>
                    Google
                </>
            ) : (
                <>
                    <Mail size={13} className="text-slate-400" />
                    Email
                </>
            )}
        </span>
    );
}

function StatusPill({ enabled }: { enabled: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-slate-300'}`}></span>
            <span className={`text-xs font-bold ${enabled ? 'text-slate-600' : 'text-slate-400'}`}>
                {enabled ? 'Active' : 'Suspended'}
            </span>
        </span>
    );
}

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<'name' | 'joined'>('joined');
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [selected, setSelected] = useState<AdminUser | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to load users", err);
            toast.error("Failed to load users.");
        } finally {
            setLoading(false);
        }
    };

    // Keep the open drawer in sync with the latest user data.
    const syncSelected = (updated: AdminUser) => {
        setSelected(prev => (prev && prev.id === updated.id ? updated : prev));
    };

    const changeRole = async (userId: number, newRole: string) => {
        if (userId === currentUser?.id && newRole !== 'ROLE_ADMIN') {
            toast.error("You can't remove your own admin role.");
            return;
        }
        const prev = users;
        const existing = users.find(u => u.id === userId);
        setUsers(users.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
        if (existing) syncSelected({ ...existing, role: newRole });
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });
            toast.success(`Role updated to ${formatRole(newRole)}.`);
        } catch (err: any) {
            setUsers(prev); // rollback
            if (existing) syncSelected(existing);
            toast.error(err?.response?.data?.error || "Failed to update role.");
        }
    };

    const toggleStatus = async (user: AdminUser) => {
        if (user.id === currentUser?.id) {
            toast.error("You can't suspend your own account.");
            return;
        }
        const next = !user.enabled;
        setBusyId(user.id);
        try {
            const res = await api.patch(`/admin/users/${user.id}/status`, { enabled: next });
            const updated: AdminUser = res.data;
            setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
            syncSelected(updated);
            toast.success(next ? `${user.username} reactivated.` : `${user.username} suspended.`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to update account status.");
        } finally {
            setBusyId(null);
        }
    };

    const deleteUser = async (user: AdminUser) => {
        if (currentUser?.id === user.id) {
            toast.error("You can't delete your own account.");
            return;
        }
        if (!window.confirm(`Permanently delete "${user.username}"? This cannot be undone.`)) return;
        setBusyId(user.id);
        try {
            await api.delete(`/admin/users/${user.id}`);
            setUsers(prev => prev.filter(u => u.id !== user.id));
            setSelected(prev => (prev?.id === user.id ? null : prev));
            toast.success(`${user.username} deleted.`);
        } catch (err) {
            console.error("Failed to delete user", err);
            toast.error("Failed to delete user.");
        } finally {
            setBusyId(null);
        }
    };

    const roleCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: users.length };
        for (const u of users) counts[u.role] = (counts[u.role] || 0) + 1;
        return counts;
    }, [users]);

    const visibleUsers = useMemo(() => {
        const q = search.toLowerCase();
        return users
            .filter(u => roleFilter === 'ALL' || u.role === roleFilter)
            .filter(u =>
                q === '' ||
                u.username.toLowerCase().includes(q) ||
                (u.fullName || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.phoneNumber || '').toLowerCase().includes(q)
            )
            .sort((a, b) => {
                if (sortBy === 'name') {
                    return (a.fullName || a.username).localeCompare(b.fullName || b.username);
                }
                // joined: newest first; nulls last
                const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bt - at;
            });
    }, [users, search, roleFilter, sortBy]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Toaster position="top-right" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">User Management</h1>
                    <p className="text-slate-500 mt-2 font-medium">Control platform access, roles, and account status.</p>
                </div>
            </div>

            {/* Role filter tabs */}
            <div className="flex flex-wrap gap-2">
                {ROLE_FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setRoleFilter(f.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            roleFilter === f.key ? 'bg-secondary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Filter size={14} />
                        {f.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleFilter === f.key ? 'bg-white/20' : 'bg-slate-300 text-slate-700'}`}>
                            {roleCounts[f.key] || 0}
                        </span>
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by name, email, handle, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all shadow-sm font-medium text-secondary"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <ArrowUpDown className="absolute left-3 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'name' | 'joined')}
                                className="bg-white border border-slate-200 pl-9 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all shadow-sm font-bold text-slate-600 cursor-pointer"
                            >
                                <option value="joined">Newest first</option>
                                <option value="name">Name (A–Z)</option>
                            </select>
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {visibleUsers.length} user{visibleUsers.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Identity</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Auth</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold">Loading Identity Graph...</td></tr>}
                            {!loading && visibleUsers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold">No users found matching query.</td></tr>}
                            {!loading && visibleUsers.map(user => {
                                const isSelf = user.id === currentUser?.id;
                                return (
                                    <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${!user.enabled ? 'bg-slate-50/40' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar user={user} />
                                                <div>
                                                    <p className="font-bold text-secondary flex items-center gap-2">
                                                        {user.fullName || user.username}
                                                        {isSelf && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">You</span>}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium">@{user.username} · ID {user.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-semibold text-slate-700">{user.email}</p>
                                            <p className="text-xs text-slate-400 font-medium">{user.phoneNumber || 'No phone'}</p>
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value={user.role || 'ROLE_PATIENT'}
                                                onChange={(e) => changeRole(user.id, e.target.value)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-full border outline-none cursor-pointer ${ROLE_BADGE[user.role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                            >
                                                <option value="ROLE_ADMIN">Administrator</option>
                                                <option value="ROLE_DOCTOR">Doctor</option>
                                                <option value="ROLE_PATIENT">Patient</option>
                                            </select>
                                        </td>
                                        <td className="p-4"><AuthBadge provider={user.authProvider} /></td>
                                        <td className="p-4"><span className="text-sm font-semibold text-slate-600">{formatDate(user.createdAt)}</span></td>
                                        <td className="p-4"><StatusPill enabled={user.enabled} /></td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setSelected(user)}
                                                    className="p-2 text-slate-400 hover:text-secondary hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(user)}
                                                    disabled={isSelf || busyId === user.id}
                                                    className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                                        user.enabled ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-green-500 hover:text-green-600 hover:bg-green-50'
                                                    }`}
                                                    title={isSelf ? "You can't suspend yourself" : user.enabled ? 'Suspend account' : 'Reactivate account'}
                                                >
                                                    {user.enabled ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(user)}
                                                    disabled={isSelf || busyId === user.id}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title={isSelf ? "You can't delete yourself" : "Delete user"}
                                                >
                                                    <UserX size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User detail drawer (slide-over) */}
            <AnimatePresence>
                {selected && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setSelected(null)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.25 }}
                            className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <h3 className="text-lg font-extrabold text-secondary">User Details</h3>
                                <button onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-4">
                                    <Avatar user={selected} dim="w-16 h-16" />
                                    <div>
                                        <p className="text-xl font-extrabold text-secondary">{selected.fullName || selected.username}</p>
                                        <p className="text-sm text-slate-500 font-medium">@{selected.username}</p>
                                        <div className="mt-2"><StatusPill enabled={selected.enabled} /></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <DetailRow icon={<Mail size={16} />} label="Email" value={selected.email} />
                                    <DetailRow icon={<Phone size={16} />} label="Phone" value={selected.phoneNumber || '—'} />
                                    <DetailRow icon={<ShieldCheck size={16} />} label="Role" value={formatRole(selected.role)} badge={ROLE_BADGE[selected.role]} />
                                    <DetailRow icon={<Calendar size={16} />} label="Joined" value={formatDate(selected.createdAt)} />
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400">{<Mail size={16} />}</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sign-in method</p>
                                            <div className="mt-1"><AuthBadge provider={selected.authProvider} /></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</p>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-bold text-slate-600">Change role</span>
                                        <select
                                            value={selected.role}
                                            onChange={(e) => changeRole(selected.id, e.target.value)}
                                            disabled={selected.id === currentUser?.id}
                                            className={`text-xs font-bold px-3 py-2 rounded-lg border outline-none cursor-pointer disabled:opacity-50 ${ROLE_BADGE[selected.role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                        >
                                            <option value="ROLE_ADMIN">Administrator</option>
                                            <option value="ROLE_DOCTOR">Doctor</option>
                                            <option value="ROLE_PATIENT">Patient</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => toggleStatus(selected)}
                                        disabled={selected.id === currentUser?.id || busyId === selected.id}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                            selected.enabled
                                                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                                : 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                                        }`}
                                    >
                                        {selected.enabled ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                                        {selected.enabled ? 'Suspend account' : 'Reactivate account'}
                                    </button>

                                    <button
                                        onClick={() => deleteUser(selected)}
                                        disabled={selected.id === currentUser?.id || busyId === selected.id}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <UserX size={18} />
                                        Delete user
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DetailRow({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                {badge ? (
                    <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full border ${badge}`}>{value}</span>
                ) : (
                    <p className="text-sm font-bold text-secondary truncate">{value}</p>
                )}
            </div>
        </div>
    );
}
