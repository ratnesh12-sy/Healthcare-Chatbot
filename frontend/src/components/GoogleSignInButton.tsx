"use client";
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';

/**
 * "Sign in with Google" button. Renders nothing if Google isn't configured
 * (NEXT_PUBLIC_GOOGLE_CLIENT_ID unset), so login/signup pages degrade gracefully.
 */
export default function GoogleSignInButton({ onError }: { onError?: (msg: string) => void }) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const { googleLogin } = useAuth();

    if (!clientId) return null;

    return (
        <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs font-semibold text-muted uppercase">or</span>
                <div className="h-px flex-1 bg-line" />
            </div>
            <div className="flex justify-center">
                <GoogleLogin
                    onSuccess={async (cred) => {
                        try {
                            if (cred.credential) await googleLogin(cred.credential);
                        } catch (e: any) {
                            onError?.(e?.response?.data?.message || 'Google sign-in failed. Please try again.');
                        }
                    }}
                    onError={() => onError?.('Google sign-in was cancelled or failed.')}
                    useOneTap={false}
                    width="320"
                />
            </div>
        </div>
    );
}
