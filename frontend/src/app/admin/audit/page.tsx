"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { Search, ShieldAlert, RefreshCw, UserCog, UserX, Activity } from 'lucide-react';

interface AuditLogEntry {
    id: number;
    adminUsername: string | null;
    adminFullName: string | null;
    actionType: string;
    targetUserId: number | null;
    targetUsername: string | null;
    details: string | null;
    timestamp: string;
}

// Per-action styling for the badge. Unknown action types fall back to slate.
const ACTION_STYLES: Record<string, { badge: string; icon: JSX.Element }> = {
    ROLE_UPDATE: { badge: 'bg-pastel-sky text-pastel-skyInk border-pastel-sky', icon: <UserCog size={14} /> },
    USER_DELETED: { badge: 'bg-pastel-rose text-pastel-roseInk border-rose-200', icon: <UserX size={14} /> },
};

const formatActionLabel = (action: string) =>
    action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/audit');
            setLogs(res.data);
            setError(null);
        } catch (err) {
            console.error("Failed to load audit logs", err);
            setError("Couldn't load the audit trail. Please refresh or try again later.");
        } finally {
            setLoading(false);
        }
    };

    // Distinct action types present in the data, for the filter dropdown.
    const actionTypes = useMemo(
        () => Array.from(new Set(logs.map((l) => l.actionType))).sort(),
        [logs]
    );

    const filteredLogs = useMemo(() => {
        const q = search.toLowerCase();
        return logs.filter((log) => {
            const matchesAction = actionFilter === 'ALL' || log.actionType === actionFilter;
            const matchesSearch =
                q === '' ||
                log.actionType.toLowerCase().includes(q) ||
                (log.adminUsername || '').toLowerCase().includes(q) ||
                (log.adminFullName || '').toLowerCase().includes(q) ||
                (log.targetUsername || '').toLowerCase().includes(q) ||
                (log.details || '').toLowerCase().includes(q);
            return matchesAction && matchesSearch;
        });
    }, [logs, search, actionFilter]);

    // The backend caps the response at 500 most-recent rows.
    const atCap = logs.length >= 500;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight flex items-center gap-3">
                        <ShieldAlert className="text-rose-500 w-8 h-8" />
                        Security Audit Trail
                    </h1>
                    <p className="text-muted mt-2 font-medium">
                        Immutable record of administrative actions across the platform.
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-line rounded-xl font-bold text-muted hover:text-secondary hover:border-line shadow-sm transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-medium flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button onClick={fetchLogs} className="px-4 py-1.5 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors shrink-0">
                        Retry
                    </button>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-2xl border border-line overflow-hidden">
                <div className="p-6 border-b border-line bg-surface flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-4 top-3.5 text-muted w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by admin, action, target, or details..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-line pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all shadow-sm font-medium text-secondary"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="bg-white border border-line px-4 py-3 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all shadow-sm font-bold text-muted cursor-pointer"
                        >
                            <option value="ALL">All Actions</option>
                            {actionTypes.map((a) => (
                                <option key={a} value={a}>{formatActionLabel(a)}</option>
                            ))}
                        </select>
                        <span className="text-xs font-bold text-muted uppercase tracking-wider whitespace-nowrap">
                            {filteredLogs.length} event{filteredLogs.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface border-b border-line">
                                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Timestamp</th>
                                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Action</th>
                                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Performed By</th>
                                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Target</th>
                                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {loading && (
                                <tr><td colSpan={5} className="p-8 text-center text-muted font-bold">Loading audit trail…</td></tr>
                            )}
                            {!loading && filteredLogs.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-muted font-bold">
                                    {logs.length === 0 ? 'No administrative actions have been logged yet.' : 'No events match your filters.'}
                                </td></tr>
                            )}
                            {!loading && filteredLogs.map((log) => {
                                const style = ACTION_STYLES[log.actionType] || {
                                    badge: 'bg-surface text-muted border-line',
                                    icon: <Activity size={14} />,
                                };
                                return (
                                    <tr key={log.id} className="hover:bg-surface transition-colors">
                                        <td className="p-4 whitespace-nowrap">
                                            <p className="text-sm font-semibold text-secondary">
                                                {new Date(log.timestamp).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-muted font-medium">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${style.badge}`}>
                                                {style.icon}
                                                {formatActionLabel(log.actionType)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-secondary text-sm">{log.adminFullName || log.adminUsername || 'Unknown'}</p>
                                            {log.adminUsername && (
                                                <p className="text-xs text-muted font-medium">@{log.adminUsername}</p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {log.targetUserId == null ? (
                                                <span className="text-xs text-muted font-medium">—</span>
                                            ) : (
                                                <div>
                                                    <p className="text-sm font-semibold text-secondary">
                                                        {log.targetUsername || <span className="italic text-muted">deleted user</span>}
                                                    </p>
                                                    <p className="text-xs text-muted font-medium">ID: {log.targetUserId}</p>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-muted font-medium max-w-md">{log.details || '—'}</p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {atCap && (
                    <div className="p-3 text-center text-xs font-bold text-muted bg-surface border-t border-line uppercase tracking-wider">
                        Showing the 500 most recent events
                    </div>
                )}
            </div>
        </div>
    );
}
