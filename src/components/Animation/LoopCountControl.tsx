import React from 'react';
import { Infinity as InfinityIcon } from 'lucide-react';
import { getLoopPlays } from '../../utils/keyframes';

interface LoopCountControlProps {
    /** Stored value: unset / 0 = loop forever, N = play N times. */
    value?: number;
    onChange: (next: number | undefined) => void;
    accent?: string;
    disabled?: boolean;
}

const QUICK_COUNTS = [1, 2, 3, 5];

/**
 * "How many times does this loop play?" — Forever, a quick count, or any
 * custom number. Shared by the Properties panel and the Animation Studio so
 * both surfaces edit `animationLoopCount` identically.
 */
export const LoopCountControl: React.FC<LoopCountControlProps> = ({ value, onChange, accent = '#9b7df8', disabled }) => {
    const plays = getLoopPlays(value);
    const forever = plays === 0;

    const chip = (active: boolean): React.CSSProperties => ({
        background: active ? `${accent}22` : '#1a1a24',
        border: `1px solid ${active ? accent + '70' : '#2a2a38'}`,
        color: active ? accent : '#9ca3af',
    });

    return (
        <div className={`space-y-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onChange(undefined)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition"
                    style={chip(forever)}
                    title="Loop until the banner ends"
                >
                    <InfinityIcon size={12} />
                    Forever
                </button>
                {QUICK_COUNTS.map((n) => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        className="px-2 py-1 rounded-md text-[11px] font-medium transition min-w-[28px]"
                        style={chip(plays === n)}
                        title={`Play ${n} time${n === 1 ? '' : 's'}`}
                    >
                        {n}×
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    placeholder="∞"
                    value={forever ? '' : plays}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return onChange(undefined);
                        const n = getLoopPlays(Number(raw));
                        onChange(n > 0 ? Math.min(999, n) : undefined);
                    }}
                    className="w-16 border border-[#2a2a35] rounded px-2 py-1 text-xs focus:outline-none bg-[#1a1a21] text-gray-100 font-mono"
                    title="Custom number of plays (leave empty to loop forever)"
                />
                <span className="text-[10px] text-gray-500">
                    {forever ? 'Loops until the banner ends' : `Plays ${plays} time${plays === 1 ? '' : 's'}, then holds`}
                </span>
            </div>
        </div>
    );
};
