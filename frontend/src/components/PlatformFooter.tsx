"use client";
import { usePublicSettings } from '@/lib/usePublicSettings';

/** Footer showing the configurable platform name and support email. */
export default function PlatformFooter() {
    const s = usePublicSettings();
    const name = s.platformName || 'HealthCare AI Assistant';
    return (
        <footer className="px-4 md:px-8 py-4 text-center text-xs text-muted border-t border-line">
            © {name}
            {s.supportEmail ? (
                <> · Support: <a href={`mailto:${s.supportEmail}`} className="text-primary hover:underline">{s.supportEmail}</a></>
            ) : null}
        </footer>
    );
}
