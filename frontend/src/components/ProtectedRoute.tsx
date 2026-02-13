"use client";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth() as any; // Cast for now, will fix AuthContext types next
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (allowedRoles && !allowedRoles.includes(user.roles[0])) {
                router.push('/dashboard');
            }
        }
    }, [user, loading, router, allowedRoles]);

    if (loading || !user) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return children;
};

export default ProtectedRoute;
