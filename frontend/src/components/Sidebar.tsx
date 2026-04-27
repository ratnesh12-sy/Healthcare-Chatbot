"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    MessageSquare,
    Calendar,
    Users,
    LogOut,
    UserCircle,
    ShieldAlert,
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
        { name: 'Profile', icon: <UserCircle size={20} />, path: '/dashboard/profile', roles: ['ROLE_PATIENT', 'ROLE_DOCTOR'] },
        { name: 'Admin Console', icon: <ShieldAlert size={20} className="text-rose-500" />, path: '/admin', roles: ['ROLE_ADMIN'] },
    ];

    const userRole = user?.roles?.[0];

    const sidebarContent = (
        <div className="w-64 bg-white shadow-soft min-h-screen flex flex-col">
            <div className="p-6 text-2xl font-extrabold flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-xl">
                        H
                    </div>
                    <span className="text-secondary">HealthAI</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600 p-1">
                        <X size={24} />
                    </button>
                )}
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                {menuItems.filter(item => userRole && item.roles.includes(userRole)).map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-6 py-3.5 transition-all relative ${pathname === item.path
                            ? 'text-white'
                            : 'text-secondary/70 hover:text-primary hover:bg-surface'
                            }`}
                    >
                        {pathname === item.path && (
                            <div className="absolute inset-0 bg-primary rounded-r-full -ml-4" />
                        )}
                        <div className="relative z-10 flex items-center gap-3">
                            {item.icon}
                            <span className="font-semibold">{item.name}</span>
                        </div>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
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
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
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
