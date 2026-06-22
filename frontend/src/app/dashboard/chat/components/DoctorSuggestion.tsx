import React, { useMemo } from 'react';
import { Stethoscope } from 'lucide-react';
import { extractSuggestions } from '@/lib/suggestionExtraction';

interface DoctorSuggestionProps {
    aiMessage: string;
}

export default function DoctorSuggestion({ aiMessage }: DoctorSuggestionProps) {
    const suggestions = useMemo(() => extractSuggestions(aiMessage), [aiMessage]);

    if (!suggestions || suggestions.length === 0) return null;

    return (
        <div className="mt-3 bg-primary-soft/50 border border-primary-soft rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <Stethoscope size={16} className="text-primary" />
                <span className="text-xs font-bold text-[#5040c0] uppercase tracking-wider">Suggested Actions</span>
            </div>
            <ul className="space-y-1.5">
                {suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-secondary flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span className="leading-tight">{suggestion}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
