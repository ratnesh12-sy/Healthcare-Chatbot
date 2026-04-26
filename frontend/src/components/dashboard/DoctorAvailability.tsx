"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Copy, Plus, Trash2, Save, CalendarOff, ArrowRight } from 'lucide-react';
import { DoctorService } from '@/lib/doctorService';
import toast from 'react-hot-toast';

const DAYS = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
    { id: 6, label: 'Saturday' },
    { id: 7, label: 'Sunday' }
];

const TEMPLATES = [
    { label: 'Clinic Hours', blocks: [{ startTime: '09:00', endTime: '12:00', slotDuration: 30 }, { startTime: '13:00', endTime: '17:00', slotDuration: 30 }] },
    { label: 'Hospital Shift', blocks: [{ startTime: '08:00', endTime: '16:00', slotDuration: 20 }] },
    { label: 'Weekend Only', blocks: [{ startTime: '10:00', endTime: '14:00', slotDuration: 30 }] }
];

export default function DoctorAvailability() {
    const [schedule, setSchedule] = useState<{ [key: number]: any[] }>({});
    const [exceptions, setExceptions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'weekly' | 'exceptions' | 'preview'>('weekly');
    
    // Exception Form
    const [exDate, setExDate] = useState('');
    const [exIsAvailable, setExIsAvailable] = useState(false);
    const [exStart, setExStart] = useState('09:00');
    const [exEnd, setExEnd] = useState('12:00');
    const [exReason, setExReason] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [schedData, excData] = await Promise.all([
                DoctorService.getWeeklySchedule(),
                DoctorService.getExceptions()
            ]);

            const grouped: { [key: number]: any[] } = {};
            DAYS.forEach(d => grouped[d.id] = []);
            schedData.forEach((item: any) => {
                if (!grouped[item.dayOfWeek]) grouped[item.dayOfWeek] = [];
                grouped[item.dayOfWeek].push(item);
            });
            setSchedule(grouped);
            setExceptions(excData);
        } catch (err) {
            toast.error("Failed to load availability");
        }
    };

    const handleSaveDay = async (dayOfWeek: number) => {
        try {
            const loading = toast.loading(`Saving ${DAYS.find(d => d.id === dayOfWeek)?.label}...`);
            await DoctorService.saveWeeklySchedule(dayOfWeek, schedule[dayOfWeek] || []);
            toast.success("Saved successfully", { id: loading });
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save schedule");
        }
    };

    const handleApplyMondayToWeek = async () => {
        if (!schedule[1] || schedule[1].length === 0) {
            toast.error("Monday has no schedule to copy.");
            return;
        }
        
        const loading = toast.loading("Applying to Monday-Friday...");
        try {
            const mondayBlocks = schedule[1].map((b: any) => ({ ...b, id: null }));
            
            // Apply 2 (Tue) through 5 (Fri)
            for (let day = 2; day <= 5; day++) {
                await DoctorService.saveWeeklySchedule(day, mondayBlocks);
            }
            await loadData();
            toast.success("Schedule applied to weekdays!", { id: loading });
        } catch (err) {
            toast.error("Failed to apply bulk schedule", { id: loading });
        }
    };

    const addBlock = (dayOfWeek: number) => {
        setSchedule(prev => ({
            ...prev,
            [dayOfWeek]: [...(prev[dayOfWeek] || []), { startTime: '09:00', endTime: '17:00', slotDuration: 30 }]
        }));
    };

    const removeBlock = (dayOfWeek: number, index: number) => {
        setSchedule(prev => ({
            ...prev,
            [dayOfWeek]: prev[dayOfWeek].filter((_, i) => i !== index)
        }));
    };

    const updateBlock = (dayOfWeek: number, index: number, field: string, value: any) => {
        setSchedule(prev => {
            const updated = [...prev[dayOfWeek]];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, [dayOfWeek]: updated };
        });
    };

    const applyTemplate = (dayOfWeek: number, templateBlocks: any[]) => {
        setSchedule(prev => ({
            ...prev,
            [dayOfWeek]: [...templateBlocks]
        }));
        toast.success("Template applied (Click Save)");
    };

    const handleAddException = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const loading = toast.loading("Adding exception...");
            await DoctorService.saveException({
                exceptionDate: exDate,
                isAvailable: exIsAvailable,
                startTime: exIsAvailable ? exStart : null,
                endTime: exIsAvailable ? exEnd : null,
                reason: exReason
            });
            toast.success("Exception saved!", { id: loading });
            setExDate('');
            setExReason('');
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to add exception");
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex border-b border-slate-100 bg-slate-50">
                <button 
                    className={`flex-1 py-4 font-bold text-sm ${activeTab === 'weekly' ? 'text-primary border-b-2 border-primary bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('weekly')}
                >
                    Weekly Schedule
                </button>
                <button 
                    className={`flex-1 py-4 font-bold text-sm ${activeTab === 'exceptions' ? 'text-primary border-b-2 border-primary bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('exceptions')}
                >
                    Leaves & Exceptions
                </button>
                <button 
                    className={`flex-1 py-4 font-bold text-sm ${activeTab === 'preview' ? 'text-primary border-b-2 border-primary bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('preview')}
                >
                    Preview Mode
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'weekly' && (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                            <div>
                                <h3 className="font-bold text-indigo-900">Pro Tip: Bulk Copy</h3>
                                <p className="text-sm text-indigo-700 mt-1">Set up Monday, then copy it to the rest of the work week.</p>
                            </div>
                            <button onClick={handleApplyMondayToWeek} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                                <Copy className="w-4 h-4" /> Apply Monday to Mon-Fri
                            </button>
                        </div>

                        <div className="space-y-6">
                            {DAYS.map(day => (
                                <div key={day.id} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-lg font-bold text-secondary w-28">{day.label}</h4>
                                            
                                            <div className="flex gap-2">
                                                {TEMPLATES.map((t, idx) => (
                                                    <button key={idx} onClick={() => applyTemplate(day.id, t.blocks)} className="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300">
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => addBlock(day.id)} className="p-2 text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1 text-sm font-semibold">
                                                <Plus className="w-4 h-4" /> Add Shift
                                            </button>
                                            <button onClick={() => handleSaveDay(day.id)} className="px-4 py-2 bg-primary text-white font-semibold text-sm rounded-lg hover:bg-primary/90 flex items-center gap-2 shadow-sm">
                                                <Save className="w-4 h-4" /> Save {day.label}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {(!schedule[day.id] || schedule[day.id].length === 0) ? (
                                            <div className="p-4 border border-dashed border-slate-300 rounded-xl text-slate-400 text-sm font-semibold flex items-center justify-center bg-white">
                                                Day Off (No Shifts)
                                            </div>
                                        ) : (
                                            schedule[day.id].map((block, idx) => (
                                                <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <Clock className="w-4 h-4 text-slate-400" />
                                                        <input 
                                                            type="time" 
                                                            value={block.startTime} 
                                                            onChange={(e) => updateBlock(day.id, idx, 'startTime', e.target.value)}
                                                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-primary"
                                                        />
                                                        <span className="text-slate-400">to</span>
                                                        <input 
                                                            type="time" 
                                                            value={block.endTime} 
                                                            onChange={(e) => updateBlock(day.id, idx, 'endTime', e.target.value)}
                                                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-primary"
                                                        />
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-500">Duration:</span>
                                                        <select 
                                                            value={block.slotDuration}
                                                            onChange={(e) => updateBlock(day.id, idx, 'slotDuration', parseInt(e.target.value))}
                                                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-primary bg-slate-50"
                                                        >
                                                            <option value={15}>15 mins</option>
                                                            <option value={20}>20 mins</option>
                                                            <option value={30}>30 mins</option>
                                                            <option value={45}>45 mins</option>
                                                            <option value={60}>60 mins</option>
                                                        </select>
                                                    </div>
                                                    
                                                    <button onClick={() => removeBlock(day.id, idx)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'exceptions' && (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                            <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                                <CalendarOff className="w-5 h-5 text-orange-500" /> Add Leave / Exception
                            </h3>
                            <form onSubmit={handleAddException} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-600 mb-1">Date</label>
                                        <input required type="date" value={exDate} onChange={e => setExDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-primary outline-none text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-600 mb-1">Type</label>
                                        <select value={exIsAvailable ? "true" : "false"} onChange={e => setExIsAvailable(e.target.value === "true")} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-primary outline-none text-slate-700 bg-slate-50">
                                            <option value="false">Full Day Leave</option>
                                            <option value="true">Partial Day Override</option>
                                        </select>
                                    </div>
                                </div>

                                {exIsAvailable && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-600 mb-1">Override Start Time</label>
                                            <input required type="time" value={exStart} onChange={e => setExStart(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-primary outline-none text-slate-700" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-600 mb-1">Override End Time</label>
                                            <input required type="time" value={exEnd} onChange={e => setExEnd(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-primary outline-none text-slate-700" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1">Reason (Optional)</label>
                                    <input type="text" placeholder="e.g. Sick Leave, Conference" value={exReason} onChange={e => setExReason(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-primary outline-none text-slate-700" />
                                </div>
                                
                                <button type="submit" className="w-full py-3 bg-secondary text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                                    Save Override
                                </button>
                            </form>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-secondary">Upcoming Leaves</h3>
                            {exceptions.length === 0 ? (
                                <p className="text-sm text-slate-500">No leaves scheduled.</p>
                            ) : (
                                exceptions.map(ex => (
                                    <div key={ex.id} className="flex justify-between items-center p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white transition-colors">
                                        <div>
                                            <div className="font-bold text-slate-700 flex items-center gap-2">
                                                {new Date(ex.exceptionDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                {!ex.isAvailable ? (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded uppercase tracking-wider">Off</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded uppercase tracking-wider">Partial</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1">
                                                {ex.isAvailable ? `Available: ${ex.startTime} - ${ex.endTime}` : 'Full Day Unavailability'}
                                                {ex.reason && ` • ${ex.reason}`}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="space-y-6 animate-in fade-in flex flex-col items-center justify-center py-10">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 flex items-center justify-center rounded-full mb-4">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-secondary">Simulation Mode</h2>
                        <p className="text-slate-500 max-w-md text-center">
                            The Preview feature connects to the live <span className="font-mono text-xs bg-slate-100 px-1 rounded text-primary">GET /api/appointments/available-slots</span> endpoint to show exactly what patients see. 
                        </p>
                        <p className="text-sm text-indigo-600 font-semibold bg-indigo-50 px-4 py-2 rounded-lg">
                            This tests TreeSet Generation + Exception Overrides + Active Bookings natively.
                        </p>
                        <div className="mt-4">
                            <p className="text-xs text-slate-400 font-medium">To test your configurations, log in as a patient and navigate to the Booking Flow.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
