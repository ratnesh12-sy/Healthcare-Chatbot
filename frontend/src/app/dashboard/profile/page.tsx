"use client";
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User, Camera, Mail, ShieldCheck, Settings, Bell, Calendar, Activity, Heart, Pill, AlertTriangle, Phone, UserCheck } from 'lucide-react';

interface ProfileData {
    fullName: string;
    username: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: string | null;
    bloodGroup: string | null;
    allergies: string | null;
    chronicDiseases: string | null;
    currentMedications: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    profileCompleted: boolean;
}

const PROFILE_FIELDS: (keyof ProfileData)[] = [
    'fullName', 'phoneNumber', 'dateOfBirth', 'gender', 'bloodGroup',
    'allergies', 'chronicDiseases', 'currentMedications',
    'emergencyContactName', 'emergencyContactPhone'
];

function calculateCompleteness(data: ProfileData): number {
    let filled = 0;
    PROFILE_FIELDS.forEach(field => {
        const val = data[field];
        if (val !== null && val !== undefined && val !== '') filled++;
    });
    return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

function ShimmerBlock({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
}

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/v1/profile');
                setProfile(res.data);
            } catch {
                // Profile may not exist yet, use auth context defaults
                if (user) {
                    setProfile({
                        fullName: user.fullName || '',
                        username: user.username || '',
                        email: user.email || '',
                        phoneNumber: '',
                        dateOfBirth: '',
                        gender: null,
                        bloodGroup: null,
                        allergies: null,
                        chronicDiseases: null,
                        currentMedications: null,
                        emergencyContactName: null,
                        emergencyContactPhone: null,
                        profileCompleted: false,
                    });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    const handleChange = (field: keyof ProfileData, value: string) => {
        if (!profile) return;
        setProfile({ ...profile, [field]: value });
        if (errors[field]) {
            const next = { ...errors };
            delete next[field];
            setErrors(next);
        }
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        setMessage(null);
        setErrors({});

        try {
            const res = await api.put('/v1/profile', {
                fullName: profile.fullName,
                phoneNumber: profile.phoneNumber || null,
                dateOfBirth: profile.dateOfBirth || null,
                gender: profile.gender || null,
                bloodGroup: profile.bloodGroup || null,
                allergies: profile.allergies || null,
                chronicDiseases: profile.chronicDiseases || null,
                currentMedications: profile.currentMedications || null,
                emergencyContactName: profile.emergencyContactName || null,
                emergencyContactPhone: profile.emergencyContactPhone || null,
            });
            setProfile(res.data);
            setMessage({ type: 'success', text: 'Profile saved successfully!' });
        } catch (err: any) {
            if (err.response?.status === 400 && typeof err.response.data === 'object') {
                setErrors(err.response.data);
                setMessage({ type: 'error', text: 'Please fix the validation errors below.' });
            } else if (err.response?.status === 409) {
                setMessage({ type: 'error', text: 'Profile was updated elsewhere. Please refresh.' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
            }
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-end">
                    <div>
                        <ShimmerBlock className="h-8 w-48 mb-2" />
                        <ShimmerBlock className="h-4 w-72" />
                    </div>
                    <ShimmerBlock className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <ShimmerBlock className="h-72 w-full" />
                        <ShimmerBlock className="h-40 w-full" />
                    </div>
                    <div className="md:col-span-2 space-y-6">
                        <ShimmerBlock className="h-64 w-full" />
                        <ShimmerBlock className="h-64 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    const completeness = calculateCompleteness(profile);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Your Profile</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your personal and medical information.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-teal-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Toast Message */}
            {message && (
                <div className={`p-4 rounded-xl font-medium text-sm border ${
                    message.type === 'success'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                } animate-in fade-in slide-in-from-top-2 duration-300`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Avatar & Completeness */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-surface"></div>
                        <div className="relative mt-8 mb-4">
                            <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white relative z-10">
                                {profile.fullName?.charAt(0) || profile.username?.charAt(0) || 'U'}
                            </div>
                        </div>
                        <h2 className="text-xl font-extrabold text-secondary">{profile.fullName || profile.username}</h2>
                        <p className="text-slate-500 font-medium capitalize mt-1">
                            {user?.roles?.[0]?.replace('ROLE_', '').toLowerCase() || 'Patient'}
                        </p>
                        <div className="mt-6 w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-xl text-sm font-bold border border-green-100">
                            <ShieldCheck size={16} />
                            Verified Account
                        </div>
                    </div>

                    {/* Profile Completeness */}
                    <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
                        <h3 className="text-lg font-bold text-secondary mb-4">Profile Completeness</h3>
                        <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${completeness}%`,
                                    background: completeness === 100
                                        ? 'linear-gradient(90deg, #10b981, #059669)'
                                        : completeness >= 60
                                        ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                                        : 'linear-gradient(90deg, #f59e0b, #d97706)',
                                }}
                            />
                        </div>
                        <p className="text-sm text-slate-500 mt-3 font-medium text-center">
                            <span className="font-extrabold text-secondary">{completeness}%</span> complete
                        </p>
                    </div>
                </div>

                {/* Right Column: Forms */}
                <div className="md:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
                        <h3 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
                            <User className="text-primary w-6 h-6" />
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldInput label="Full Name" value={profile.fullName} error={errors.fullName}
                                onChange={(v) => handleChange('fullName', v)} />
                            <FieldInput label="Username" value={profile.username} disabled />
                            <FieldInput label="Email" value={profile.email} disabled type="email"
                                icon={<Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />} className="md:col-span-2" />
                            <FieldInput label="Phone (10 digits)" value={profile.phoneNumber || ''} error={errors.phoneNumber}
                                onChange={(v) => handleChange('phoneNumber', v)} placeholder="9876543210" />
                            <FieldInput label="Date of Birth" value={profile.dateOfBirth || ''} error={errors.dateOfBirth}
                                onChange={(v) => handleChange('dateOfBirth', v)} type="date" />
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Gender</label>
                                <select
                                    value={profile.gender || ''}
                                    onChange={(e) => handleChange('gender', e.target.value)}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                >
                                    <option value="">Select</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Medical Information */}
                    <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
                        <h3 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
                            <Heart className="text-red-500 w-6 h-6" />
                            Medical Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Blood Group</label>
                                <select
                                    value={profile.bloodGroup || ''}
                                    onChange={(e) => handleChange('bloodGroup', e.target.value)}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium"
                                >
                                    <option value="">Select</option>
                                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                                        <option key={bg} value={bg}>{bg}</option>
                                    ))}
                                </select>
                            </div>
                            <div /> {/* spacer */}
                            <FieldTextarea label="Allergies" value={profile.allergies || ''}
                                onChange={(v) => handleChange('allergies', v)}
                                placeholder="e.g., Penicillin, Peanuts" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} />
                            <FieldTextarea label="Chronic Diseases" value={profile.chronicDiseases || ''}
                                onChange={(v) => handleChange('chronicDiseases', v)}
                                placeholder="e.g., Diabetes, Hypertension" icon={<Activity className="w-4 h-4 text-red-500" />} />
                            <FieldTextarea label="Current Medications" value={profile.currentMedications || ''}
                                onChange={(v) => handleChange('currentMedications', v)}
                                placeholder="e.g., Metformin 500mg" icon={<Pill className="w-4 h-4 text-blue-500" />} className="md:col-span-2" />
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
                        <h3 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
                            <Phone className="text-green-600 w-6 h-6" />
                            Emergency Contact
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldInput label="Contact Name" value={profile.emergencyContactName || ''}
                                onChange={(v) => handleChange('emergencyContactName', v)} placeholder="John Doe" />
                            <FieldInput label="Contact Phone" value={profile.emergencyContactPhone || ''}
                                onChange={(v) => handleChange('emergencyContactPhone', v)} placeholder="9876543210" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Reusable Field Components ---

function FieldInput({ label, value, onChange, disabled, type = "text", placeholder, icon, className = "", error }: {
    label: string; value: string; onChange?: (v: string) => void; disabled?: boolean;
    type?: string; placeholder?: string; icon?: React.ReactNode; className?: string; error?: string;
}) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label className="text-sm font-semibold text-slate-500">{label}</label>
            <div className="relative">
                {icon}
                <input
                    type={type}
                    value={value}
                    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={`w-full p-3.5 ${icon ? 'pl-12' : ''} ${
                        disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'
                    } border ${error ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium`}
                />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
    );
}

function FieldTextarea({ label, value, onChange, placeholder, icon, className = "" }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; icon?: React.ReactNode; className?: string;
}) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                {icon}
                {label}
            </label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-secondary font-medium resize-none"
            />
        </div>
    );
}
