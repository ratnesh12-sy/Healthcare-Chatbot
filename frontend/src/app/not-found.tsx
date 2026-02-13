import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
                <p className="text-gray-500 mb-8 max-w-md">
                    Sorry, we couldn't find the page you're looking for. Please check the URL or return to the dashboard.
                </p>
                <Link
                    href="/dashboard"
                    className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-indigo-600 transition-colors shadow-lg inline-block font-medium"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
