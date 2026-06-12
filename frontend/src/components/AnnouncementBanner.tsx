"use client";
import { usePublicSettings } from '@/lib/usePublicSettings';
import { Megaphone } from 'lucide-react';

/** Global admin announcement, shown to all users when the `announcement` setting is non-empty. */
export default function AnnouncementBanner() {
    const s = usePublicSettings();
    if (!s.announcement) return null;
    return (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 md:px-8 py-2.5 text-sm font-medium flex items-center gap-2">
            <Megaphone size={16} className="shrink-0 text-amber-500" />
            <span>{s.announcement}</span>
        </div>
    );
}
