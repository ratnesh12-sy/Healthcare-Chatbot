"use client";
import { useState, useEffect } from 'react';
import api from './api';

// Module-level cache so the public settings are fetched once per page load and shared
// across components (footer, banner, login button, maintenance guard).
let cache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

export function usePublicSettings() {
    const [settings, setSettings] = useState<Record<string, string>>(cache || {});

    useEffect(() => {
        if (cache) {
            setSettings(cache);
            return;
        }
        if (!inflight) {
            inflight = api.get('/public/settings')
                .then(r => { cache = r.data; return r.data as Record<string, string>; })
                .catch(() => ({} as Record<string, string>));
        }
        let active = true;
        inflight.then(d => { if (active) setSettings(d); });
        return () => { active = false; };
    }, []);

    return settings;
}
