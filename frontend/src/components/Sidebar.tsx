"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    MessageSquare,
    Calendar,
    LogOut,
    UserCircle,
    ShieldAlert,
    HeartPulse,
    X
} from 'lucide-react';

interface SidebarProps {
    isMobileOpen?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard', roles: ['ROLE_PATIENT', 'ROLE_DOCTOR'] },
        { name: 'AI Chat', icon: <MessageSquare size={20} />, path: '/dashboard/chat', roles: ['ROLE_PATIENT'] },
        { name: 'Appointments', icon: <Calendar size={20} />, path: '/dashboard/appointments', roles: ['ROLE_PATIENT', 'ROLE_DOCTOR'] },
        { name: 'Health', icon: <HeartPulse size={20} />, path: '/dashboard/health', roles: ['ROLE_PATIENT'] },
        { name: 'Profile', icon: <UserCircle size={20} />, path: '/dashboard/profile', roles: ['ROLE_PATIENT', 'ROLE_DOCTOR'] },
        { name: 'Admin Console', icon: <ShieldAlert size={20} />, path: '/admin', roles: ['ROLE_ADMIN'] },
    ];

    const userRole = user?.roles?.[0];
    const initial = user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U';
    const roleLabel = userRole?.replace('ROLE_', '').toLowerCase() || 'patient';

    const sidebarContent = (
        <div className="w-64 bg-white border-r border-line min-h-screen flex flex-col">
            <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-soft">
                        <HeartPulse size={22} />
                    </div>
                    <span className="font-display text-xl font-extrabold text-secondary">HealthAI</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="md:hidden text-muted hover:text-secondary p-1">
                        <X size={24} />
                    </button>
                )}
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1.5">
                {menuItems.filter(item => userRole && item.roles.includes(userRole)).map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all ${isActive
                                ? 'bg-primary-soft text-primary'
                                : 'text-muted hover:bg-surface hover:text-secondary'
                                }`}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-3 space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                        {initial.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-secondary truncate">{user?.fullName || user?.username}</p>
                        <p className="text-xs text-muted capitalize">{roleLabel}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors font-semibold"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar - always visible, takes space in flex layout */}
            <div className="hidden md:block">
                {sidebarContent}
            </div>

            {/* Mobile Sidebar - overlay drawer, takes ZERO space when closed */}
            {isMobileOpen && (
                <div className="md:hidden fixed inset-0 z-50">
                    {/* Dark overlay */}
                    <div
                        className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    {/* Sidebar panel */}
                    <div className="relative z-10 h-full">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
