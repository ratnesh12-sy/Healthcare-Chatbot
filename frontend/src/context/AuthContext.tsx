"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    roles: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    signup: (formData: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/auth/me');
                setUser(res.data);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const login = async (username: string, password: string) => {
        const res = await api.post('/auth/signin', { username, password });
        const { token, ...userData } = res.data;
        setUser(userData);
        router.push('/dashboard');
    };

    const signup = async (formData: any) => {
        await api.post('/auth/signup', formData);
        router.push('/login');
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            setUser(null);
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {loading ? <div className="flex h-screen items-center justify-center">Loading...</div> : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
