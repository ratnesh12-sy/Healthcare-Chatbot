"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, Clock, Mail, Award, Stethoscope, FileText, Users, CheckCircle, ToggleLeft, ToggleRight, AlertCircle, X } from 'lucide-react';
import { DoctorService, DoctorProfileDTO } from '@/lib/doctorService';
import toast, { Toaster } from 'react-hot-toast';

const DAYS = [
    { id: 1, label: 'Mon' }, { id: 2, label: 'Tue' }, { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' }, { id: 5, label: 'Fri' }, { id: 6, label: 'Sat' }, { id: 7, label: 'Sun' }
];

function ShimmerBlock({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
}

export default function DoctorProfile() {
    const { user } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<DoctorProfileDTO | null>(null);
    const [schedule, setSchedule] = useState<{ [key: number]: any[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bio, setBio] = useState('');
    const [savingBio, setSavingBio] = useState(false);
    const [togglingAvail, setTogglingAvail] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        setError(null);

        // Step 1: Load the profile (critical — the page can't render without it).
        let profileData: DoctorProfileDTO;
        try {
            profileData = await DoctorService.getDoctorProfile();
        } catch (err: any) {
            // Profile not yet created → send the doctor to onboarding instead of a blank page.
            if (err.response?.status === 403 && err.response?.data?.error === 'PROFILE_INCOMPLETE') {
                router.push('/doctor/onboarding');
                return;
            }
            setError('We couldn\'t load your profile. Please try again.');
            setLoading(false);
            return;
        }
        setProfile(profileData);
        setBio(profileData.bio || '');

        // Step 2: Load the weekly schedule (non-critical — a failure here must not blank the page).
        const grouped: { [key: number]: any[] } = {};
        DAYS.forEach(d => grouped[d.id] = []);
        try {
            const schedData = await DoctorService.getWeeklySchedule();
            schedData.forEach((item: any) => {
                if (!grouped[item.dayOfWeek]) grouped[item.dayOfWeek] = [];
                grouped[item.dayOfWeek].push(item);
            });
        } catch {
            // Leave the schedule empty; the profile itself still renders.
            toast.error('Could not load your weekly availability.');
        }
        setSchedule(grouped);
        setLoading(false);
    };

    const handleSaveBio = async () => {
        if (!profile) return;
        setSavingBio(true);
        try {
            const updated = await DoctorService.updateDoctorProfile({ bio });
            setProfile(updated);
            toast.success('Bio updated successfully');
        } catch {
            toast.error('Failed to update bio. Please try again.');
        } finally {
            setSavingBio(false);
        }
    };

    const handleToggleAvailability = async () => {
        if (!profile) return;
        setTogglingAvail(true);
        try {
            const updated = await DoctorService.updateDoctorProfile({ isAvailable: !profile.isAvailable });
            setProfile(updated);
            toast.success(updated.isAvailable ? 'You are now available for booking' : 'You are now unavailable');
        } catch {
            toast.error('Failed to update availability');
        } finally {
            setTogglingAvail(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                <ShimmerBlock className="h-56 w-full rounded-3xl" />
                <div className="grid grid-cols-2 gap-4">
                    <ShimmerBlock className="h-24" />
                    <ShimmerBlock className="h-24" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ShimmerBlock className="h-64" />
                    <ShimmerBlock className="h-64" />
                </div>
            </div>
        );
    }

    // ── Error state (instead of a silent blank page) ──
    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <X className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Couldn&apos;t load your profile</h2>
                <p className="text-muted mb-6">{error || 'Something went wrong. Please try again.'}</p>
                <button onClick={loadProfile} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-[#5040c0] transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    const fullName = profile.fullName || user?.fullName || 'Doctor';
    const specialization = profile.specialization || 'General Physician';
    const experience = profile.experienceYears ? `${profile.experienceYears} yrs experience` : '';
    const initials = profile.fullName
        ? profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'DR';

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Toaster position="top-right" />

            {/* === HERO BANNER === */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-r from-slate-800 to-[#5040c0] rounded-3xl p-8 md:p-10 overflow-hidden"
            >
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl shrink-0">
                        {initials}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">
                            {fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white/90 text-sm font-semibold rounded-full border border-white/10">
                                {specialization}
                            </span>
                            {experience && (
                                <span className="text-white/60 text-sm font-medium">
                                    • {experience}
                                </span>
                            )}
                        </div>

                        {/* Verification + Availability */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                            {profile.verificationStatus && (
                                <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${
                                    profile.verificationStatus === 'APPROVED'
                                        ? 'bg-green-500/20 text-green-300'
                                        : profile.verificationStatus === 'REJECTED'
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                    {profile.verificationStatus === 'APPROVED'
                                        ? <><ShieldCheck className="w-4 h-4" /> Verified</>
                                        : profile.verificationStatus === 'REJECTED'
                                        ? <><AlertCircle className="w-4 h-4" /> Verification Rejected</>
                                        : <><Clock className="w-4 h-4" /> Pending Verification</>
                                    }
                                </span>
                            )}
                            <button
                                onClick={handleToggleAvailability}
                                disabled={togglingAvail}
                                className="flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {profile.isAvailable ? (
                                    <span className="flex items-center gap-1.5 text-green-300">
                                        <ToggleRight className="w-5 h-5" /> Available for booking
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-white/40">
                                        <ToggleLeft className="w-5 h-5" /> Not accepting appointments
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* === STATS ROW === */}
            {(profile.totalAppointments ?? 0) > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-line flex items-center gap-4"
                    >
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-muted">Total Appointments</p>
                            <h3 className="text-2xl font-extrabold text-slate-800">{profile.totalAppointments}</h3>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-line flex items-center gap-4"
                    >
                        <div className="p-3 bg-green-50 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-muted">Completed</p>
                            <h3 className="text-2xl font-extrabold text-slate-800">{profile.completedAppointments}</h3>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* === TWO-COLUMN: DETAILS + BIO === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Professional Details */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-line"
                >
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        Professional Details
                    </h3>
                    <div className="space-y-5">
                        <DetailRow icon={<Stethoscope className="w-4 h-4 text-primary" />} label="Specialization" value={specialization} />
                        <DetailRow icon={<Clock className="w-4 h-4 text-blue-500" />} label="Experience" value={experience || '—'} />
                        <DetailRow icon={<FileText className="w-4 h-4 text-purple-500" />} label="License Number" value={profile.licenseNumber || 'Not provided'} />
                        <DetailRow icon={<Mail className="w-4 h-4 text-muted" />} label="Email" value={profile.email} />
                        <DetailRow
                            icon={<Shield className="w-4 h-4 text-green-500" />}
                            label="Verification"
                            value={
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                                    profile.verificationStatus === 'APPROVED'
                                        ? 'bg-pastel-mint text-pastel-mintInk'
                                        : profile.verificationStatus === 'REJECTED'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-pastel-sun text-pastel-sunInk'
                                }`}>
                                    {profile.verificationStatus === 'APPROVED' ? '✅ Approved'
                                        : profile.verificationStatus === 'REJECTED' ? '❌ Rejected'
                                        : '⏳ Pending'}
                                </span>
                            }
                        />
                    </div>
                </motion.div>

                {/* Bio */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-line flex flex-col"
                >
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        About
                    </h3>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="No bio added yet. Click to add one."
                        rows={6}
                        className="flex-1 w-full p-4 bg-slate-50 border border-line rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 font-medium resize-none placeholder:italic placeholder:text-muted"
                    />
                    <button
                        onClick={handleSaveBio}
                        disabled={savingBio || bio === (profile.bio || '')}
                        className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#5040c0] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {savingBio ? 'Saving...' : 'Save Bio'}
                    </button>
                </motion.div>
            </div>

            {/* === AVAILABILITY SUMMARY === */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-line"
            >
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Weekly Availability
                </h3>
                <div className="grid grid-cols-7 gap-3">
                    {DAYS.map(day => {
                        const hasSlots = schedule[day.id] && schedule[day.id].length > 0;
                        return (
                            <div
                                key={day.id}
                                className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                                    hasSlots
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-slate-50 border-line text-muted'
                                }`}
                            >
                                <span className="text-sm font-bold">{day.label}</span>
                                <span className="text-lg mt-1">{hasSlots ? '✔' : '✖'}</span>
                                {hasSlots && (
                                    <span className="text-xs mt-1 font-medium opacity-70">
                                        {schedule[day.id].length} shift{schedule[day.id].length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {Object.values(schedule).every(slots => slots.length === 0) && (
                    <p className="text-center text-sm text-muted mt-4 italic">
                        No schedule configured yet. Set up your availability from the Dashboard.
                    </p>
                )}
            </motion.div>
        </div>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="flex-1">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
            </div>
        </div>
    );
}
