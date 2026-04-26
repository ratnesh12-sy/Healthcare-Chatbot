"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';
import CalendarPicker from './CalendarPicker';
import TimeSlotsGrid, { Slot } from './TimeSlotsGrid';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BookingPanelProps {
    doctorId: number;
    doctorName: string;
    maxDays?: number;
    onBookingSuccess?: () => void;
}

export default function BookingPanel({ doctorId, doctorName, maxDays = 30, onBookingSuccess }: BookingPanelProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [symptoms, setSymptoms] = useState('');
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cache: composite key = `${doctorId}-${date}`
    const cacheRef = useRef(new Map<string, Slot[]>());
    // AbortController for flicker prevention
    const controllerRef = useRef<AbortController | null>(null);
    // Prefetch throttle
    const lastHoveredDateRef = useRef<string | null>(null);

    const cacheKey = (date: string) => `${doctorId}-${date}`;

    // ── Fetch Slots (Core) ────────────────────────────────────────
    const fetchSlots = useCallback(async (date: string, useCache: boolean = true) => {
        const key = cacheKey(date);

        // Check cache first
        if (useCache && cacheRef.current.has(key)) {
            const cached = cacheRef.current.get(key)!;
            setSlots(cached);
            guardSelectedSlot(cached);
            return;
        }

        // Abort previous in-flight request
        controllerRef.current?.abort();
        controllerRef.current = new AbortController();

        setSlotsLoading(true);
        setError(null);

        try {
            const res = await api.get('/appointments/available-slots', {
                params: { doctorId, date },
                signal: controllerRef.current.signal
            });

            const freshSlots: Slot[] = res.data?.slots || [];
            cacheRef.current.set(key, freshSlots);
            setSlots(freshSlots);
            guardSelectedSlot(freshSlots);
        } catch (err: any) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return; // Aborted, ignore
            console.error('Failed to fetch slots', err);
            setError('Failed to load available slots. Please try again.');
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    }, [doctorId]);

    // ── Slot Selection Guard ──────────────────────────────────────
    const guardSelectedSlot = (freshSlots: Slot[]) => {
        if (selectedSlot && !freshSlots.find(s => s.time === selectedSlot && s.available)) {
            setSelectedSlot(null);
        }
    };

    // ── Date Change Handler ───────────────────────────────────────
    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setSelectedSlot(null); // State reset on date change
        const dateStr = format(date, 'yyyy-MM-dd');
        fetchSlots(dateStr);
    };

    // ── Hover Prefetch (Guarded) ──────────────────────────────────
    const handleDateHover = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        // Throttle: only if different from last hovered
        if (dateStr === lastHoveredDateRef.current) return;
        lastHoveredDateRef.current = dateStr;
        // Safe: don't overwrite existing cache
        const key = cacheKey(dateStr);
        if (!cacheRef.current.has(key)) {
            // Silent prefetch (no loading state)
            api.get('/appointments/available-slots', {
                params: { doctorId, date: dateStr }
            }).then(res => {
                const prefetchedSlots: Slot[] = res.data?.slots || [];
                // Only store if still not in cache (prevents overwrite race)
                if (!cacheRef.current.has(key)) {
                    cacheRef.current.set(key, prefetchedSlots);
                }
            }).catch(() => {}); // Silently ignore prefetch errors
        }
    };

    // ── Booking Handler ───────────────────────────────────────────
    const handleBook = async () => {
        if (!selectedDate || !selectedSlot || booking) return;

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const appointmentDate = `${dateStr}T${selectedSlot}:00`;

        setBooking(true);

        try {
            await api.post('/appointments', {
                doctorId,
                appointmentDate,
                symptomsSummary: symptoms || 'No symptoms provided'
            });

            toast.success('Appointment booked successfully!');

            // Cache invalidation + refetch
            cacheRef.current.delete(cacheKey(dateStr));
            fetchSlots(dateStr, false);

            // Reset form
            setSelectedSlot(null);
            setSymptoms('');
            onBookingSuccess?.();
        } catch (err: any) {
            const message = err?.response?.data?.message;
            const status = err?.response?.status;

            if (status === 409 || status === 400) {
                toast.error(message || 'Slot already booked, please choose another');
                // Refetch to show updated availability
                cacheRef.current.delete(cacheKey(dateStr));
                fetchSlots(dateStr, false);
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        } finally {
            setBooking(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-4">
                    <CalendarPicker
                        selectedDate={selectedDate}
                        maxDays={maxDays}
                        onDateSelect={handleDateSelect}
                        onDateHover={handleDateHover}
                    />
                </div>

                {/* Slots */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[300px]">
                        {!selectedDate ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                                <div className="w-14 h-14 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
                                    <span className="text-2xl">📅</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">Select a date</h3>
                                <p className="text-sm text-slate-500">Pick a date from the calendar to see available time slots.</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                                <div className="w-14 h-14 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">Something went wrong</h3>
                                <p className="text-sm text-slate-500 mb-4">{error}</p>
                                <button
                                    onClick={() => fetchSlots(format(selectedDate, 'yyyy-MM-dd'), false)}
                                    className="px-5 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                        Dr. {doctorName}
                                    </span>
                                </div>
                                <TimeSlotsGrid
                                    slots={slots}
                                    loading={slotsLoading}
                                    selectedSlot={selectedSlot}
                                    onSlotSelect={setSelectedSlot}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Booking Confirmation Section */}
            {selectedSlot && selectedDate && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Confirm Your Appointment</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Doctor</p>
                            <p className="text-sm font-bold text-slate-800">Dr. {doctorName}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</p>
                            <p className="text-sm font-bold text-slate-800">{format(selectedDate, 'MMMM d, yyyy')}</p>
                        </div>
                        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Time</p>
                            <p className="text-lg font-extrabold text-primary">{selectedSlot}</p>
                        </div>
                    </div>

                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Describe your symptoms</label>
                        <textarea
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            rows={3}
                            placeholder="E.g. Fever for 3 days, persistent cough, headache..."
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-slate-700"
                        />
                    </div>

                    <button
                        onClick={handleBook}
                        disabled={booking}
                        className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-teal-600 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {booking ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Booking...
                            </>
                        ) : (
                            'Confirm Booking'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
