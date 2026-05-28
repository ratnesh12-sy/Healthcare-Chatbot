import React from 'react';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata = {
    title: 'HealthCare AI Assistant',
    description: 'AI-Powered Healthcare Chatbot and Appointment System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
            </head>
            <body className="font-sans antialiased">
                <ErrorBoundary>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
