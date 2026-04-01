"use client";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, UserCheck, Settings, ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    const isAdmin = user?.roles?.includes('ROLE_ADMIN');

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.replace('/dashboard');
        }
    }, [loading, isAdmin, router]);

    // Show nothing while checking auth or if not admin
    if (loading || !isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Verifying Clearance…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            {/* Admin Sidebar */}
            <aside className="w-72 bg-secondary text-white flex flex-col shadow-2xl z-20">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="bg-rose-500 text-white p-2 rounded-xl shadow-lg">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight">Admin Console</h1>
                        <p className="text-xs text-rose-400 font-bold uppercase tracking-wider mt-0.5">Superuser Access</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-300 font-medium hover:text-white">
                        <LayoutDashboard size={20} />
                        Command Center
                    </Link>
                    <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-300 font-medium hover:text-white">
                        <Users size={20} />
                        User Management
                    </Link>
                    <Link href="/admin/doctors/verify" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-300 font-medium hover:text-white">
                        <UserCheck size={20} />
                        Doctor Verification
                        <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">New</span>
                    </Link>
                    <div className="pt-8 pb-2">
                        <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">System</p>
                    </div>
                    <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-300 font-medium hover:text-white">
                        <Settings size={20} />
                        Global Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <Link href="/dashboard" className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all font-bold">
                        <ArrowLeft size={20} />
                        Back to Dashboard
                    </Link>
                    <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all font-bold">
                        <LogOut size={20} />
                        Secure Exit
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Operational</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-secondary">{user?.fullName || user?.username}</p>
                            <p className="text-xs text-rose-500 font-bold uppercase tracking-wider">Administrator</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-rose-500 flex items-center justify-center text-white font-bold shadow-sm">
                            {user?.username?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-8 relative">
                    <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 -z-10 rounded-b-[3rem] shadow-inner"></div>
                    {children}
                </div>
            </main>
        </div>
    );
}
