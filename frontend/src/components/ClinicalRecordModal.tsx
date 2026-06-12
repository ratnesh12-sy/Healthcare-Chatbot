"use client";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Plus, Trash2, Pill, FileText, Printer, Save, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const FREQUENCIES = ['Once a day', 'Twice a day', 'Three times a day', 'Four times a day', 'Every 6 hours', 'Every 8 hours', 'As needed'];

interface Item {
    medicationName: string;
    dosage: string;
    frequency: string;
    durationDays: number | '';
    instructions: string;
}

interface ClinicalRecord {
    appointmentId: number;
    doctorName: string;
    patientName: string;
    appointmentDate: string;
    noteContent: string | null;
    noteUpdatedAt: string | null;
    prescription: { generalInstructions: string | null; issuedAt: string | null; items: any[] } | null;
}

export default function ClinicalRecordModal({ appointmentId, canEdit, onClose }: { appointmentId: number; canEdit: boolean; onClose: () => void }) {
    const [record, setRecord] = useState<ClinicalRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // editable state (doctor)
    const [note, setNote] = useState('');
    const [generalInstructions, setGeneralInstructions] = useState('');
    const [items, setItems] = useState<Item[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get(`/appointments/${appointmentId}/clinical`);
                const r: ClinicalRecord = res.data;
                setRecord(r);
                setNote(r.noteContent || '');
                setGeneralInstructions(r.prescription?.generalInstructions || '');
                setItems((r.prescription?.items || []).map((i: any) => ({
                    medicationName: i.medicationName || '',
                    dosage: i.dosage || '',
                    frequency: i.frequency || 'Once a day',
                    durationDays: i.durationDays ?? '',
                    instructions: i.instructions || '',
                })));
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to load clinical record.');
                onClose();
            } finally {
                setLoading(false);
            }
        })();
    }, [appointmentId]);

    const addItem = () => setItems(prev => [...prev, { medicationName: '', dosage: '', frequency: 'Once a day', durationDays: '', instructions: '' }]);
    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: keyof Item, value: string) =>
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: field === 'durationDays' ? (value === '' ? '' : Number(value)) : value } : it));

    const save = async () => {
        setSaving(true);
        try {
            await api.put(`/doctor/appointments/${appointmentId}/note`, { content: note });
            const cleanItems = items
                .filter(i => i.medicationName.trim())
                .map(i => ({ ...i, durationDays: i.durationDays === '' ? null : i.durationDays }));
            const res = await api.put(`/doctor/appointments/${appointmentId}/prescription`, {
                generalInstructions, items: cleanItems,
            });
            setRecord(res.data);
            toast.success('Clinical record saved.');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const printRx = () => {
        if (!record) return;
        const rows = items.filter(i => i.medicationName.trim()).map(i => `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #eee">${esc(i.medicationName)}</td>
                <td style="padding:8px;border-bottom:1px solid #eee">${esc(i.dosage)}</td>
                <td style="padding:8px;border-bottom:1px solid #eee">${esc(i.frequency)}</td>
                <td style="padding:8px;border-bottom:1px solid #eee">${i.durationDays || '—'} days</td>
                <td style="padding:8px;border-bottom:1px solid #eee">${esc(i.instructions)}</td>
            </tr>`).join('');
        const html = `<!doctype html><html><head><title>Prescription</title></head>
            <body style="font-family:Arial,sans-serif;color:#1e293b;max-width:720px;margin:24px auto;padding:0 16px">
              <h1 style="color:#0d9488;margin-bottom:4px">HealthCare AI Assistant</h1>
              <p style="color:#64748b;margin-top:0">Prescription</p>
              <hr/>
              <p><b>Patient:</b> ${esc(record.patientName)}<br/>
                 <b>Doctor:</b> ${esc(record.doctorName)}<br/>
                 <b>Date:</b> ${new Date(record.appointmentDate).toLocaleString()}</p>
              ${note ? `<p><b>Notes:</b> ${esc(note)}</p>` : ''}
              <h3>Medications</h3>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead><tr style="text-align:left;background:#f1f5f9">
                  <th style="padding:8px">Medication</th><th style="padding:8px">Dosage</th><th style="padding:8px">Frequency</th><th style="padding:8px">Duration</th><th style="padding:8px">Instructions</th>
                </tr></thead><tbody>${rows || '<tr><td colspan="5" style="padding:8px">No medications.</td></tr>'}</tbody>
              </table>
              ${generalInstructions ? `<p style="margin-top:16px"><b>General instructions:</b> ${esc(generalInstructions)}</p>` : ''}
              <p style="margin-top:40px;color:#94a3b8;font-size:12px">This prescription was generated electronically.</p>
            </body></html>`;
        const w = window.open('', '_blank', 'width=820,height=920');
        if (!w) { toast.error('Allow pop-ups to print.'); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
    };

    const hasContent = (record?.noteContent || record?.prescription?.items?.length);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
                <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
                    className="bg-white rounded-3xl w-full max-w-2xl relative z-10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h3 className="text-lg font-extrabold text-secondary flex items-center gap-2">
                            <Stethoscope className="text-primary w-5 h-5" /> Clinical Record
                        </h3>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X size={18} /></button>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-slate-400 font-bold">Loading…</div>
                    ) : (
                        <div className="p-6 space-y-6 overflow-y-auto">
                            {record && (
                                <p className="text-sm text-slate-500 font-medium">
                                    {record.patientName} · {record.doctorName} · {new Date(record.appointmentDate).toLocaleString()}
                                </p>
                            )}

                            {/* Notes */}
                            <div>
                                <h4 className="font-bold text-secondary flex items-center gap-2 mb-2"><FileText size={16} className="text-slate-400" /> Doctor's Notes</h4>
                                {canEdit ? (
                                    <textarea rows={4} value={note} onChange={e => setNote(e.target.value)}
                                        placeholder="Clinical observations, diagnosis, advice…"
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm text-secondary outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                                ) : (
                                    <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 whitespace-pre-wrap">{record?.noteContent || 'No notes recorded.'}</p>
                                )}
                            </div>

                            {/* Prescription */}
                            <div>
                                <h4 className="font-bold text-secondary flex items-center gap-2 mb-2"><Pill size={16} className="text-slate-400" /> Prescription</h4>

                                {canEdit ? (
                                    <div className="space-y-3">
                                        {items.map((it, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                <input value={it.medicationName} onChange={e => updateItem(idx, 'medicationName', e.target.value)} placeholder="Medication" className="col-span-12 sm:col-span-3 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none" />
                                                <input value={it.dosage} onChange={e => updateItem(idx, 'dosage', e.target.value)} placeholder="500mg" className="col-span-4 sm:col-span-2 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none" />
                                                <select value={it.frequency} onChange={e => updateItem(idx, 'frequency', e.target.value)} className="col-span-8 sm:col-span-3 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none">
                                                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                                <input type="number" min={0} value={it.durationDays} onChange={e => updateItem(idx, 'durationDays', e.target.value)} placeholder="days" className="col-span-4 sm:col-span-1 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none" />
                                                <input value={it.instructions} onChange={e => updateItem(idx, 'instructions', e.target.value)} placeholder="After food" className="col-span-7 sm:col-span-2 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none" />
                                                <button onClick={() => removeItem(idx)} className="col-span-1 p-2 text-slate-400 hover:text-rose-500 justify-self-end" title="Remove"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                        <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"><Plus size={16} /> Add medication</button>
                                        <textarea rows={2} value={generalInstructions} onChange={e => setGeneralInstructions(e.target.value)} placeholder="General instructions (e.g. take after meals)…" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none mt-2" />
                                    </div>
                                ) : (
                                    record?.prescription?.items?.length ? (
                                        <div className="space-y-2">
                                            {record.prescription.items.map((i: any, idx: number) => (
                                                <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm">
                                                    <p className="font-bold text-secondary">{i.medicationName} {i.dosage && <span className="text-slate-500 font-medium">· {i.dosage}</span>}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{i.frequency}{i.durationDays ? ` · ${i.durationDays} days` : ''}{i.instructions ? ` · ${i.instructions}` : ''}</p>
                                                </div>
                                            ))}
                                            {record.prescription.generalInstructions && <p className="text-xs text-slate-500 italic mt-1">{record.prescription.generalInstructions}</p>}
                                        </div>
                                    ) : <p className="text-sm text-slate-400">No prescription issued.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                            {(canEdit || hasContent) && (
                                <button onClick={printRx} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 transition-colors">
                                    <Printer size={16} /> Print
                                </button>
                            )}
                            {canEdit && (
                                <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-teal-600 transition-colors disabled:opacity-50">
                                    <Save size={16} /> {saving ? 'Saving…' : 'Save'}
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function esc(s: string | null | undefined): string {
    return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
