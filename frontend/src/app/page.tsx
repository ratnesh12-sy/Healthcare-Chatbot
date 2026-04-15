"use client";
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Activity, 
  MessageSquare, 
  Calendar, 
  Shield, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Stethoscope,
  HeartPulse,
  LineChart,
  BrainCircuit,
  Settings
} from 'lucide-react';

export default function Home() {
    return (
        <main className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 glass bg-white/50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                            <Activity className="w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold text-dark tracking-tight">HealthAI</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Features</Link>
                        <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">How it Works</Link>
                        <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Login</Link>
                        <Link href="/signup" className="btn-primary py-2 px-6 text-sm">Sign Up</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-sm font-semibold mb-6">
                           <HeartPulse className="w-4 h-4" />
                           Trusted by 100,000+ users worldwide
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-dark leading-[1.1] mb-6">
                            Your Personal <br />
                            <span className="text-primary">AI Health Assistant</span>
                        </h1>
                        <p className="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed">
                            Experience the future of healthcare with instant symptom analysis, 
                            smart scheduling, and secure tracking—all powered by advanced AI.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/signup" className="btn-primary flex items-center justify-center gap-2">
                                Start Free Chat <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link href="/login" className="btn-secondary flex items-center justify-center gap-2">
                                <Calendar className="w-5 h-5" /> Book Appointment
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl bg-teal-50 border-8 border-white">
                            <Image 
                                src="/doctor.png" 
                                alt="Professional Healthcare Assistant" 
                                width={600} 
                                height={600}
                                className="w-full h-auto object-cover"
                                priority
                            />
                        </div>
                        
                        {/* Floating Cards */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="absolute -left-10 md:-left-20 bottom-10 z-20 glass p-5 rounded-2xl max-w-[240px]"
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-2 bg-teal-100 rounded-lg text-primary">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div className="font-bold text-dark leading-tight">24/7 Available Instant Response</div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.0 }}
                            className="absolute -right-6 top-10 z-20 glass p-5 rounded-2xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-full text-green-600">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Health Verified</div>
                                    <div className="font-bold text-dark">AI Diagnosis Ready</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-light">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-dark mb-4">Everything You Need for Better Health</h2>
                    <p className="text-gray-600 mb-16 max-w-2xl mx-auto">
                        Our integrated AI platform provides comprehensive support across all aspects of your health journey.
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={<BrainCircuit className="w-8 h-8" />}
                            title="AI Symptom Checker"
                            description="Describe how you feel and receive instant, science-backed health insights."
                        />
                        <FeatureCard 
                            icon={<Calendar className="w-8 h-8" />}
                            title="Smart Scheduling"
                            description="Book and manage appointments with healthcare professionals in seconds."
                        />
                        <FeatureCard 
                            icon={<Shield className="w-8 h-8" />}
                            title="Secure Medical Vault"
                            description="Industry-leading encryption keeps your sensitive health data private and safe."
                        />
                        <FeatureCard 
                            icon={<LineChart className="w-8 h-8" />}
                            title="Health Tracking"
                            description="Monitor your vitals and progress with intuitive, data-driven visualization."
                        />
                        <FeatureCard 
                            icon={<Activity className="w-8 h-8" />}
                            title="Mental Health Support"
                            description="Guided exercises and 24/7 AI-powered mental wellness assistance."
                        />
                        <FeatureCard 
                            icon={<Settings className="w-8 h-8" />}
                            title="Lab Result Analysis"
                            description="Simply upload your results and our AI will help you understand the data."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 bg-dark text-white">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 items-center gap-12">
                    <div>
                        <h2 className="text-4xl font-extrabold mb-6">Ready to take control of your health?</h2>
                        <Link href="/signup" className="btn-primary inline-flex">
                            Start Your Free Consultation
                        </Link>
                    </div>
                    <div className="text-gray-400 space-y-4">
                        <div className="flex items-center gap-2 text-white text-xl font-bold">
                            <Activity className="w-6 h-6 text-primary" />
                            HealthAI
                        </div>
                        <p className="text-sm">
                            © 2026 HealthAI Assistant. All rights reserved.
                        </p>
                        <p className="text-xs leading-relaxed italic border-t border-gray-800 pt-4">
                            Disclaimer: This AI assistant is for informational purposes only and is not a replacement for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-white p-10 rounded-3xl border border-gray-100 text-left card-hover"
        >
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-primary mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-dark">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </motion.div>
    );
}
