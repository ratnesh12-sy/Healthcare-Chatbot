"use client";
import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ChatProvider } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { Search, ChevronDown, Menu, Wrench } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import PlatformFooter from '@/components/PlatformFooter';
import { usePublicSettings } from '@/lib/usePublicSettings';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const settings = usePublicSettings();
    const isAdmin = user?.roles?.includes('ROLE_ADMIN');

    // Maintenance mode: non-admins are locked out with a friendly screen (admins keep access).
    if (settings.maintenanceMode === 'true' && user && !isAdmin) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-6">
                    <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-amber-100">
                        <Wrench size={40} />
                    </div>
                    <h1 className="text-2xl font-extrabold text-secondary mb-2">Under Maintenance</h1>
                    <p className="text-muted max-w-md font-medium">
                        {settings.platformName || 'The platform'} is temporarily unavailable while we perform maintenance. Please check back soon.
                    </p>
                    {settings.supportEmail && (
                        <a href={`mailto:${settings.supportEmail}`} className="mt-6 text-primary font-bold hover:underline">{settings.supportEmail}</a>
                    )}
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <ChatProvider>
            <div className="flex bg-light min-h-screen text-secondary">
                <Sidebar isMobileOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                    <AnnouncementBanner />
                    {/* Top Header */}
                    <header className="h-20 bg-white border-b border-line flex items-center justify-between px-4 md:px-8 z-0">
                        <div className="flex items-center gap-4">
                            {/* Mobile Hamburger Toggle */}
                            <button
                                className="md:hidden p-2 text-muted hover:text-primary transition-colors hover:bg-surface rounded-xl"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <Menu size={24} />
                            </button>

                            {/* Search Bar - Hidden on mobile */}
                            <div className="hidden md:flex items-center bg-surface border border-line px-4 py-2.5 rounded-2xl w-96 focus-within:ring-2 focus-within:ring-primary/15 focus-within:border-primary transition-all">
                                <Search className="w-5 h-5 text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search appointments, doctors..."
                                    className="bg-transparent border-none outline-none ml-3 w-full text-sm placeholder-muted text-secondary"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6">
                            <NotificationBell />
                            <div className="flex items-center gap-3 cursor-pointer select-none">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-soft-sm">
                                    {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-bold text-secondary">{user?.fullName || user?.username}</p>
                                    <p className="text-xs text-muted capitalize">{user?.roles?.[0]?.replace('ROLE_', '').toLowerCase() || 'Patient'}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-muted" />
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                        <div className="max-w-6xl mx-auto">
                            {children}
                        </div>
                    </main>
                    <PlatformFooter />
                </div>
            </div>
            </ChatProvider>
        </ProtectedRoute>
    );
}
