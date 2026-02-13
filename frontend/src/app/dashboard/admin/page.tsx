"use client";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Users, UserCog, Stethoscope, Trash2, Plus } from 'lucide-react';

interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: { name: string };
    createdAt: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users');
        }
    };

    const deleteUser = async (id: number) => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/admin/users/${id}`);
                fetchUsers();
            } catch (err) {
                console.error('Failed to delete');
            }
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
                    <p className="text-gray-500">System management and analytics.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-indigo-600 transition-all">
                    <Plus size={18} /> Add New Doctor
                </button>
            </div>

            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 font-bold transition-all ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                >
                    Users List
                </button>
                <button
                    onClick={() => setActiveTab('doctors')}
                    className={`px-4 py-2 font-bold transition-all ${activeTab === 'doctors' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                >
                    Specialists
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">User</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">Created</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                            {u.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{u.fullName}</div>
                                            <div className="text-xs text-gray-400">@{u.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role.name === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                        u.role.name === 'ROLE_DOCTOR' ? 'bg-blue-100 text-blue-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {u.role.name.replace('ROLE_', '')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-400 text-sm">
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
