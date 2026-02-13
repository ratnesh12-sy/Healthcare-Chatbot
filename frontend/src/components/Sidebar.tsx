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
    UserCircle
} from 'lucide-react';

const Sidebar: React.FC = () => {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard', roles: ['ROLE_PATIENT', 'ROLE_DOCTOR', 'ROLE_ADMIN'] },
        { name: 'AI Chat', icon: <MessageSquare size={20} />, path: '/dashboard/chat', roles: ['ROLE_PATIENT'] },
        { name: 'Appointments', icon: <Calendar size={20} />, path: '/dashboard/appointments', roles: ['ROLE_PATIENT', 'ROLE_DOCTOR'] },
        { name: 'Manage Users', icon: <Users size={20} />, path: '/dashboard/admin', roles: ['ROLE_ADMIN'] },
        { name: 'Profile', icon: <UserCircle size={20} />, path: '/dashboard/profile', roles: ['ROLE_PATIENT', 'ROLE_DOCTOR', 'ROLE_ADMIN'] },
    ];

    const userRole = user?.roles?.[0];

    return (
        <div className="w-64 bg-white border-r min-h-screen flex flex-col">
            <div className="p-6 text-2xl font-bold text-primary flex items-center gap-2">
                <span>HealthCare</span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                {menuItems.filter(item => userRole && item.roles.includes(userRole)).map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === item.path ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-blue-50'
                            }`}
                    >
                        {item.icon}
                        <span className="font-medium">{item.name}</span>
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
};

export default Sidebar;
