"use client";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Search, Shield, UserX, UserCheck, MoreVertical, Edit2 } from 'lucide-react';

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const changeRole = async (userId: number, newRole: string) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });
            // Update local state instantly
            setUsers(users.map(u => {
                if(u.id === userId) {
                    return { ...u, role: { name: newRole } };
                }
                return u;
            }));
        } catch (err) {
            console.error("Failed to update role");
            alert("Failed to update role. Ensure accurate role nomenclature.");
        }
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(search.toLowerCase()) || 
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">User Management</h1>
                    <p className="text-slate-500 mt-2 font-medium">Control platform access, roles, and administrative statuses.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 relative">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search users by name, email, or handle..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all shadow-sm font-medium text-secondary"
                        />
                    </div>
                    {/* HIDDEN FOR NOW - Future implementation to bypass Doctor Verification Queue */}
                    <button className="hidden sm:flex items-center gap-2 px-5 py-3 bg-secondary text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all ml-auto">
                        <UserCheck size={18} />
                        Add New Doctor
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Identity</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Role</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold">Loading Identity Graph...</td></tr>}
                            {!loading && filteredUsers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold">No users found matching query.</td></tr>}
                            {!loading && filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center">
                                                {user.fullName?.charAt(0) || user.username.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-secondary">{user.fullName || user.username}</p>
                                                <p className="text-xs text-slate-500 font-medium">ID: {user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-semibold text-slate-700">{user.email}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <select 
                                                value={user.role?.name || 'ROLE_PATIENT'}
                                                onChange={(e) => changeRole(user.id, e.target.value)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-full border outline-none cursor-pointer ${
                                                    user.role?.name === 'ROLE_ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    user.role?.name === 'ROLE_DOCTOR' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}
                                            >
                                                <option value="ROLE_ADMIN">Administrator</option>
                                                <option value="ROLE_DOCTOR">Doctor</option>
                                                <option value="ROLE_PATIENT">Patient</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-xs font-bold text-slate-600">Active</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Suspend User">
                                                <UserX size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
