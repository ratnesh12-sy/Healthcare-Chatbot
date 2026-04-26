"use client";
import { DayPicker } from 'react-day-picker';
import { addDays, isBefore, startOfDay } from 'date-fns';
import 'react-day-picker/style.css';

interface CalendarPickerProps {
    selectedDate: Date | undefined;
    maxDays: number;
    onDateSelect: (date: Date) => void;
    onDateHover?: (date: Date) => void;
}

export default function CalendarPicker({ selectedDate, maxDays, onDateSelect, onDateHover }: CalendarPickerProps) {
    const today = startOfDay(new Date());
    const maxDate = addDays(today, maxDays);

    const handleDayMouseEnter = (day: Date) => {
        if (onDateHover && !isBefore(day, today) && !isBefore(maxDate, day)) {
            onDateHover(day);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateSelect(date)}
                onDayMouseEnter={handleDayMouseEnter}
                disabled={[
                    { before: today },
                    { after: maxDate }
                ]}
                modifiersClassNames={{
                    selected: '!bg-primary !text-white !rounded-lg !font-bold',
                    today: '!font-extrabold !text-primary',
                    disabled: '!text-slate-300 !cursor-not-allowed'
                }}
                className="!font-sans"
            />
        </div>
    );
}
