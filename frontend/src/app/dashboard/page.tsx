"use client";
import { useAuth } from '@/context/AuthContext';
import PatientDashboard from '@/components/dashboard/PatientDashboard';
import DoctorDashboard from '@/components/dashboard/DoctorDashboard';

export default function DashboardHome() {
    const { user } = useAuth();
    
    // Safety check during initial load
    if (!user) return null;

    const isDoctor = user.roles?.includes('ROLE_DOCTOR');

    return isDoctor ? <DoctorDashboard /> : <PatientDashboard />;
}
