"use client";
import { useState, useEffect } from 'react';
import { Server, ShieldCheck, CalendarClock, Globe, Save, Bot, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

type Config = Record<string, string>;

const DEFAULTS: Config = {
    aiEnabled: 'true',
    aiModel: 'llama-3.3-70b-versatile',
    aiMinConfidence: 'LOW',
    medicalDisclaimer: '',
    registrationEnabled: 'true',
    googleSignInEnabled: 'true',
    sessionHours: '168',
    minPasswordLength: '6',
    defaultDurationMinutes: '30',
    leadTimeHours: '0',
    maxPerPatientPerDay: '0',
    cancellationWindowHours: '0',
    maintenanceMode: 'false',
    platformName: 'HealthCare AI Assistant',
    supportEmail: '',
    announcement: '',
};

function Section({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent: string; children: React.ReactNode }) {
    return (
        <div className="bg-white p-7 rounded-3xl shadow-soft border border-slate-100 space-y-5">
            <h2 className="text-lg font-extrabold text-secondary flex items-center gap-3">
                <span className={accent}>{icon}</span>
                {title}
            </h2>
            <div className="space-y-5">{children}</div>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
            {children}
            {hint && <p className="text-xs text-slate-400 font-medium mt-1.5">{hint}</p>}
        </div>
    );
}

function Toggle({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) {
    return (
        <div onClick={onClick} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="pr-4">
                <h4 className="font-bold text-secondary text-sm">{label}</h4>
                {hint && <p className="text-xs text-slate-500 font-medium mt-0.5">{hint}</p>}
            </div>
            <div className={`w-12 h-6 rounded-full relative shadow-inner transition-colors shrink-0 ${on ? 'bg-green-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${on ? 'right-1' : 'left-1'}`}></div>
            </div>
        </div>
    );
}

const inputCls = "w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-secondary font-medium text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none";

export default function SettingsPage() {
    const [config, setConfig] = useState<Config>(DEFAULTS);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/admin/settings');
                setConfig({ ...DEFAULTS, ...res.data });
            } catch {
                toast.error('Failed to load settings.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const set = (name: string, value: string) => setConfig(prev => ({ ...prev, [name]: value }));
    const onChange = (e: any) => set(e.target.name, e.target.value);
    const toggle = (name: string) => set(name, config[name] === 'true' ? 'false' : 'true');
    const isOn = (name: string) => config[name] === 'true';

    const save = async () => {
        setIsSaving(true);
        try {
            await api.post('/admin/settings', config);
            toast.success('Settings saved and applied.');
        } catch {
            toast.error('Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Toaster position="top-right" />

            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Global Settings</h1>
                    <p className="text-slate-500 mt-2 font-medium">Configure platform behavior. Changes apply immediately on save.</p>
                </div>
                <button
                    onClick={save}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg hover:shadow-rose-500/20 active:translate-y-0.5 disabled:opacity-50"
                >
                    <Save size={18} />
                    {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                {/* AI Assistant */}
                <Section icon={<Bot size={22} />} title="AI Assistant" accent="text-primary">
                    <Toggle on={isOn('aiEnabled')} onClick={() => toggle('aiEnabled')} label="AI assistant enabled" hint="Global on/off for the chatbot. When off, users see an 'unavailable' notice." />
                    <Field label="Model" hint="Which Groq model answers patient questions.">
                        <select name="aiModel" value={config.aiModel} onChange={onChange} className={inputCls}>
                            <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Default)</option>
                            <option value="llama3-8b-8192">llama3-8b-8192 (Fast)</option>
                            <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Legacy)</option>
                        </select>
                    </Field>
                    <Field label="Minimum confidence to show" hint="Answers below this confidence are replaced with a 'consult a doctor' message (consultation AI).">
                        <select name="aiMinConfidence" value={config.aiMinConfidence} onChange={onChange} className={inputCls}>
                            <option value="LOW">Show all answers</option>
                            <option value="MEDIUM">Hide low-confidence</option>
                            <option value="HIGH">Only high-confidence</option>
                        </select>
                    </Field>
                    <Field label="System prompt / disclaimer" hint="The assistant's persona & safety guidance. The JSON/safety contract is always appended automatically.">
                        <textarea name="medicalDisclaimer" rows={4} value={config.medicalDisclaimer} onChange={onChange} placeholder="You are a professional healthcare assistant…" className={`${inputCls} resize-none`} />
                    </Field>
                </Section>

                {/* Access & Security */}
                <Section icon={<ShieldCheck size={22} />} title="Access & Security" accent="text-blue-500">
                    <Toggle on={isOn('registrationEnabled')} onClick={() => toggle('registrationEnabled')} label="Allow new registrations" hint="When off, the signup endpoint is closed." />
                    <Toggle on={isOn('googleSignInEnabled')} onClick={() => toggle('googleSignInEnabled')} label="Allow Google Sign-In" hint="Hides the Google button and rejects Google logins when off." />
                    <Field label="Session length (hours)" hint="How long a login stays valid. Applies to new logins.">
                        <input type="number" min={1} name="sessionHours" value={config.sessionHours} onChange={onChange} className={inputCls} />
                    </Field>
                    <Field label="Minimum password length" hint="Enforced on signup (hard floor is 6).">
                        <input type="number" min={6} name="minPasswordLength" value={config.minPasswordLength} onChange={onChange} className={inputCls} />
                    </Field>
                </Section>

                {/* Appointments */}
                <Section icon={<CalendarClock size={22} />} title="Appointments" accent="text-teal-500">
                    <Field label="Default duration (minutes)" hint="Length assigned to new bookings.">
                        <input type="number" min={5} step={5} name="defaultDurationMinutes" value={config.defaultDurationMinutes} onChange={onChange} className={inputCls} />
                    </Field>
                    <Field label="Booking lead time (hours)" hint="Minimum notice before a slot can be booked. 0 = none.">
                        <input type="number" min={0} name="leadTimeHours" value={config.leadTimeHours} onChange={onChange} className={inputCls} />
                    </Field>
                    <Field label="Max appointments per patient / day" hint="Daily booking cap per patient. 0 = unlimited.">
                        <input type="number" min={0} name="maxPerPatientPerDay" value={config.maxPerPatientPerDay} onChange={onChange} className={inputCls} />
                    </Field>
                    <Field label="Cancellation window (hours)" hint="Minimum hours before a slot that a patient may cancel. 0 = no restriction.">
                        <input type="number" min={0} name="cancellationWindowHours" value={config.cancellationWindowHours} onChange={onChange} className={inputCls} />
                    </Field>
                </Section>

                {/* Platform & Branding */}
                <Section icon={<Globe size={22} />} title="Platform & Branding" accent="text-amber-500">
                    <Toggle on={isOn('maintenanceMode')} onClick={() => toggle('maintenanceMode')} label="Maintenance mode" hint="Blocks non-admin users with a maintenance notice. Admins keep full access." />
                    {isOn('maintenanceMode') && (
                        <div className="flex items-start gap-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>Maintenance mode is ON — patients and doctors are currently locked out.</span>
                        </div>
                    )}
                    <Field label="Platform name" hint="Shown in the footer and titles.">
                        <input type="text" name="platformName" value={config.platformName} onChange={onChange} className={inputCls} />
                    </Field>
                    <Field label="Support email" hint="Shown to users for help requests.">
                        <input type="email" name="supportEmail" value={config.supportEmail} onChange={onChange} placeholder="support@example.com" className={inputCls} />
                    </Field>
                    <Field label="Announcement banner" hint="A message shown to all users across the app. Leave blank to hide.">
                        <input type="text" name="announcement" value={config.announcement} onChange={onChange} placeholder="e.g. Scheduled maintenance Sunday 10 PM" className={inputCls} />
                    </Field>
                </Section>
            </div>
        </div>
    );
}
