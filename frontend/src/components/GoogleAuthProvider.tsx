"use client";
import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

/**
 * Wraps the app with Google's OAuth provider — but only when a Client ID is set.
 * If NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing, children render as normal and the
 * Google button hides itself, so the app works fine before Google is configured.
 */
export default function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return <>{children}</>;
    return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
