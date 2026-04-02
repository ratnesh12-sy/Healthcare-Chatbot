"use client";
import { useState, useEffect } from 'react';
import { Settings, Server, Globe, Save } from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
    const [config, setConfig] = useState({
        apiKey: '',
        aiModel: 'llama-3.3-70b-versatile',
        medicalDisclaimer: 'Medical Disclaimer: This AI assistant provides general informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.',
        force2FA: 'false'
    });
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/admin/settings');
                if (Object.keys(res.data).length > 0) {
                    setConfig(prev => ({ ...prev, ...res.data }));
                }
            } catch (err) {
                console.error("Failed to fetch global settings", err);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const toggle2FA = () => {
        setConfig(prev => ({ ...prev, force2FA: prev.force2FA === 'true' ? 'false' : 'true' }));
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            await api.post('/admin/settings', config);
            alert("Settings synchronized successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to synchronize settings.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Global Directives</h1>
                    <p className="text-slate-400 mt-2 font-medium">Modulate underlying platform systems and external API linkages.</p>
                </div>
                <button 
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg hover:shadow-rose-500/20 active:translate-y-0.5 disabled:opacity-50"
                >
                    <Save size={18} />
                    {isSaving ? "Deploying..." : "Deploy Changes"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Artificial Intelligence API Settings */}
                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 space-y-6">
                    <h2 className="text-xl font-extrabold text-secondary flex items-center gap-3">
                        <Server className="text-primary" />
                        Groq AI Core Integration
                    </h2>
                    
                    <div className="space-y-4 text-left">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Secure API Key</label>
                            <input 
                                type="password" 
                                name="apiKey"
                                value={config.apiKey}
                                onChange={handleChange}
                                placeholder="gsk_***************************************" 
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-secondary font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Model Definition Wrapper</label>
                            <select 
                                name="aiModel"
                                value={config.aiModel}
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-secondary font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Default)</option>
                                <option value="llama3-8b-8192">llama3-8b-8192 (Fast)</option>
                                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Legacy)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Patient Safety Defaults */}
                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 space-y-6">
                    <h2 className="text-xl font-extrabold text-secondary flex items-center gap-3">
                        <Globe className="text-amber-500" />
                        Patient Compliance Directives
                    </h2>
                    
                    <div className="space-y-4 text-left">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Universal Legal Disclaimer & AI System Prompt</label>
                            <textarea 
                                rows={5}
                                name="medicalDisclaimer"
                                value={config.medicalDisclaimer}
                                onChange={handleChange}
                                placeholder="System Prompt directing AI identity..."
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-secondary font-medium text-sm focus:ring-2 focus:ring-amber-500/20 outline-none resize-none" 
                            />
                        </div>
                        <div 
                            onClick={toggle2FA}
                            className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <div>
                                <h4 className="font-bold text-secondary text-sm">Force 2FA Requirement</h4>
                                <p className="text-xs text-slate-500 font-medium">Require multi-factor authentication for doctors</p>
                            </div>
                            <div className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${config.force2FA === 'true' ? 'bg-green-500' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${config.force2FA === 'true' ? 'right-1' : 'left-1'}`}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
