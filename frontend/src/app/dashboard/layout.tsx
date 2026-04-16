"use client";
import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { Bell, Search, ChevronDown, Menu } from 'lucide-react';
import Image from 'next/image';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    return (
        <ProtectedRoute>
            <div className="flex bg-light min-h-screen text-secondary">
                <Sidebar isMobileOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                    {/* Top Header */}
                    <header className="h-20 bg-white shadow-sm flex items-center justify-between px-4 md:px-8 z-0">
                        <div className="flex items-center gap-4">
                            {/* Mobile Hamburger Toggle */}
                            <button 
                                className="md:hidden p-2 text-gray-500 hover:text-primary transition-colors hover:bg-gray-50 rounded-lg"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <Menu size={24} />
                            </button>
                            
                            {/* Search Bar - Hidden on mobile */}
                            <div className="hidden md:flex items-center bg-gray-100 px-4 py-2 rounded-full w-96">
                                <Search className="w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search appointments, patients..." 
                                    className="bg-transparent border-none outline-none ml-3 w-full text-sm placeholder-gray-400 text-secondary"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <button className="relative p-2 text-gray-400 hover:text-primary transition-colors">
                                <Bell className="w-6 h-6" />
                                <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            <div className="flex items-center gap-3 cursor-pointer select-none">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border-2 border-white shadow-sm">
                                    {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-semibold">{user?.fullName || user?.username}</p>
                                    <p className="text-xs text-gray-500 capitalize">{user?.roles?.[0]?.replace('ROLE_', '').toLowerCase() || 'Patient'}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                        <div className="max-w-6xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
