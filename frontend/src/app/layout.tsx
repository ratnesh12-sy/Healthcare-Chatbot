import React from 'react';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
    title: 'HealthCare AI Assistant',
    description: 'AI-Powered Healthcare Chatbot and Appointment System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="font-sans antialiased">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
