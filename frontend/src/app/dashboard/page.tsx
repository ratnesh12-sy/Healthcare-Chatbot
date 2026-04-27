"use client";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PatientDashboard from '@/components/dashboard/PatientDashboard';
import DoctorDashboard from '@/components/dashboard/DoctorDashboard';

export default function DashboardHome() {
    const { user } = useAuth();
    const router = useRouter();
    
    const isAdmin = user?.roles?.includes('ROLE_ADMIN');
    const isDoctor = user?.roles?.includes('ROLE_DOCTOR');

    useEffect(() => {
        if (isAdmin) {
            router.replace('/admin');
        }
    }, [isAdmin, router]);

    // Safety check during initial load
    if (!user || isAdmin) return null;

    return isDoctor ? <DoctorDashboard /> : <PatientDashboard />;
}
