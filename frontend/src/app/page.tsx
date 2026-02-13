"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, MessageSquare, Calendar, Shield } from 'lucide-react';

export default function Home() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Activity className="w-8 h-8" />
                    <span>HealthCare AI</span>
                </div>
                <div className="space-x-4">
                    <Link href="/login" className="px-4 py-2 text-primary hover:text-indigo-700 font-medium">Login</Link>
                    <Link href="/signup" className="px-6 py-2 bg-primary text-white rounded-full hover:bg-indigo-600 transition-colors shadow-lg">Sign Up</Link>
                </div>
            </nav>

            <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6"
                >
                    Your Personal <span className="text-primary">AI Health</span> Assistant
                </motion.h1>
                <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                    Skip the wait. Instant symptom analysis, easy appointment booking, and secure medical history - all in one place.
                </p>

                <div className="grid md:grid-cols-3 gap-8 mt-16">
                    <Card
                        icon={<MessageSquare className="w-8 h-8 text-primary" />}
                        title="AI Chatbot"
                        description="Describe your symptoms and get instant advice from our advanced AI."
                    />
                    <Card
                        icon={<Calendar className="w-8 h-8 text-secondary" />}
                        title="Book Appointments"
                        description="Connect with top specialists at your convenience."
                    />
                    <Card
                        icon={<Shield className="w-8 h-8 text-accent" />}
                        title="Secure & Private"
                        description="Your medical data is encrypted and safe with us."
                    />
                </div>

                <div className="mt-20">
                    <Link href="/signup" className="px-10 py-4 bg-primary text-white text-lg font-bold rounded-full hover:bg-indigo-600 transition-all shadow-xl hover:scale-105 active:scale-95">
                        Get Started Now
                    </Link>
                </div>
            </section>
        </main>
    );
}

function Card({ icon, title, description }) {
    return (
        <motion.div
            whileHover={{ y: -10 }}
            className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-left"
        >
            <div className="mb-4">{icon}</div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
            <p className="text-gray-600">{description}</p>
        </motion.div>
    );
}
