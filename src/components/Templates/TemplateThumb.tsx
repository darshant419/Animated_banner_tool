import React from 'react';
import { Film } from 'lucide-react';

interface TemplateThumbProps {
    width: number;
    height: number;
    accent?: string;
    animated?: boolean;
    /** Stored canvas snapshot — shown instead of the placeholder when available. */
    thumbnailUrl?: string;
    /** Max rendered height in px (cards use a taller preview than the sidebar list). */
    maxHeight?: number;
}

/**
 * Proportional preview for a banner template / banner: renders the saved canvas
 * snapshot when there is one, otherwise a schematic placeholder with the ISI
 * strip so every card keeps the correct aspect ratio.
 */
export const TemplateThumb: React.FC<TemplateThumbProps> = ({
    width,
    height,
    accent = '#006937',
    animated = false,
    thumbnailUrl,
    maxHeight = 120,
}) => {
    const ratio = height / width;
    const w = Math.min(240, maxHeight / ratio);
    const h = Math.min(maxHeight, w * ratio);
    const isiPct = 35;

    return (
        <div
            className="rounded-md overflow-hidden relative border border-white/10 shadow-sm shrink-0 bg-[#1a1a21]"
            style={{ width: w, height: h }}
        >
            {thumbnailUrl ? (
                <img
                    src={thumbnailUrl}
                    alt={`${width}×${height} preview`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <>
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ top: 0, height: `${100 - isiPct}%`, background: 'linear-gradient(135deg, #e2e8f0, #f8fafc)' }}
                    >
                        <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${accent}22`, color: accent }}>
                            {width}×{height}
                        </span>
                    </div>
                    <div
                        className="absolute inset-x-0 bottom-0 flex items-center px-2 text-[7px] text-gray-500"
                        style={{ height: `${isiPct}%`, background: '#f1f5f9', borderTop: `2px solid ${accent}` }}
                    >
                        <span className="truncate">ISI scroll area</span>
                    </div>
                </>
            )}
            {animated && (
                <span className="absolute top-1 right-1 bg-[#15151c]/90 rounded px-1 py-0.5 flex items-center gap-0.5 text-[7px] font-semibold text-red-500 shadow-sm">
                    <Film size={8} /> ANIM
                </span>
            )}
        </div>
    );
};
