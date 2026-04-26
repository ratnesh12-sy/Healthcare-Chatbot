"use client";
import SlotButton from './SlotButton';
import { Calendar, Sun, CloudSun, Moon } from 'lucide-react';

export interface Slot {
    time: string;
    available: boolean;
    reason: string | null;
}

interface TimeSlotsGridProps {
    slots: Slot[];
    loading: boolean;
    selectedSlot: string | null;
    onSlotSelect: (time: string) => void;
}

function groupSlots(slots: Slot[]) {
    const morning: Slot[] = [];
    const afternoon: Slot[] = [];
    const evening: Slot[] = [];

    for (const slot of slots) {
        const hour = parseInt(slot.time.split(':')[0], 10);
        if (hour < 12) {
            morning.push(slot);
        } else if (hour < 17) {
            afternoon.push(slot);
        } else {
            evening.push(slot);
        }
    }

    return { morning, afternoon, evening };
}

function SkeletonGrid() {
    return (
        <div className="space-y-6">
            {[1, 2, 3].map(group => (
                <div key={group}>
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-3" />
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SlotGroup({ label, icon, slots, selectedSlot, onSlotSelect }: { 
    label: string; 
    icon: React.ReactNode;
    slots: Slot[]; 
    selectedSlot: string | null; 
    onSlotSelect: (time: string) => void;
}) {
    if (slots.length === 0) return null;

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{label}</h4>
                <span className="text-xs text-slate-400 font-semibold">
                    ({slots.filter(s => s.available).length} available)
                </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {slots.map(slot => (
                    <SlotButton
                        key={slot.time}
                        time={slot.time}
                        available={slot.available}
                        reason={slot.reason}
                        selected={selectedSlot === slot.time}
                        onClick={onSlotSelect}
                    />
                ))}
            </div>
        </div>
    );
}

export default function TimeSlotsGrid({ slots, loading, selectedSlot, onSlotSelect }: TimeSlotsGridProps) {
    if (loading) return <SkeletonGrid />;

    if (!slots || slots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">No slots available for this day</h3>
                <p className="text-sm text-slate-500 max-w-xs">The doctor has no availability on this date. Try selecting a different day.</p>
            </div>
        );
    }

    const { morning, afternoon, evening } = groupSlots(slots);

    return (
        <div className="space-y-6">
            <SlotGroup label="Morning" icon={<Sun className="w-4 h-4 text-amber-500" />} slots={morning} selectedSlot={selectedSlot} onSlotSelect={onSlotSelect} />
            <SlotGroup label="Afternoon" icon={<CloudSun className="w-4 h-4 text-orange-500" />} slots={afternoon} selectedSlot={selectedSlot} onSlotSelect={onSlotSelect} />
            <SlotGroup label="Evening" icon={<Moon className="w-4 h-4 text-indigo-500" />} slots={evening} selectedSlot={selectedSlot} onSlotSelect={onSlotSelect} />
        </div>
    );
}
