"use client";

interface SlotButtonProps {
    time: string;
    available: boolean;
    reason: string | null;
    selected: boolean;
    onClick: (time: string) => void;
}

export default function SlotButton({ time, available, reason, selected, onClick }: SlotButtonProps) {
    return (
        <button
            type="button"
            disabled={!available}
            aria-disabled={!available}
            aria-label={`Time ${time} ${available ? 'Available' : reason || 'Unavailable'}`}
            title={!available ? (reason || 'Unavailable') : ''}
            onClick={() => available && onClick(time)}
            className={`
                relative px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${available && selected
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-2 ring-primary scale-105'
                    : available
                        ? 'bg-white text-slate-700 border border-slate-200 hover:border-primary hover:text-primary hover:shadow-md cursor-pointer focus:ring-primary'
                        : 'bg-slate-100 text-slate-400 border border-slate-100 cursor-not-allowed'
                }
            `}
        >
            {time}
            {!available && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-300 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white font-black">✕</span>
                </span>
            )}
        </button>
    );
}
