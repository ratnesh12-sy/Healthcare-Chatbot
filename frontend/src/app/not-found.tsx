import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-surface px-4">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-secondary mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-secondary mb-6">Page Not Found</h2>
                <p className="text-muted mb-8 max-w-md">
                    Sorry, we couldn't find the page you're looking for. Please check the URL or return to the dashboard.
                </p>
                <Link
                    href="/dashboard"
                    className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary transition-colors shadow-lg inline-block font-medium"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
