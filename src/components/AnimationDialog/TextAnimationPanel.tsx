import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Type, Search, X } from 'lucide-react';
import type { DesignElement } from '../../store/designStore';
import {
    TEXT_ANIMATIONS,
    attachTextAnimation,
    ensureTextAnimationCss,
    plainTextToHtml,
    renderTextAnimationHtml,
    type TextAnimationEffect,
} from '../../utils/textAnimations';

const ACCENT = '#f5b942';

/** Loops one effect forever on a short sample, like the Moving Letters gallery. */
const EffectPreview: React.FC<{ effect: TextAnimationEffect; sample: string; color: string }> = ({ effect, sample, color }) => {
    const boxRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        box.innerHTML = renderTextAnimationHtml(effect, plainTextToHtml(sample));
        const ctl = attachTextAnimation(box, effect);
        let timer = 0;
        const loop = () => {
            ctl.play();
            timer = window.setTimeout(loop, ctl.length + 1100);
        };
        loop();
        return () => {
            window.clearTimeout(timer);
            ctl.destroy();
        };
    }, [effect, sample]);

    return (
        <div
            ref={boxRef}
            className="relative w-full overflow-hidden text-center"
            style={{ color, fontSize: 17, fontWeight: 800, lineHeight: 1.3, padding: '6px 4px', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}
        />
    );
};

interface TextAnimationPanelProps {
    element?: DesignElement;
    onChange: (patch: Partial<DesignElement>) => void;
}

/**
 * Animation Studio → "Text Animation" section: the Moving Letters catalog of
 * letter / word effects, applied to the selected text layer.
 */
export const TextAnimationPanel: React.FC<TextAnimationPanelProps> = ({ element, onChange }) => {
    const [query, setQuery] = useState('');
    const isText = element?.type === 'text';
    const current = element?.textAnimation;

    useEffect(ensureTextAnimationCss, []);

    const sample = useMemo(() => {
        const raw = (element?.text || '').replace(/\s+/g, ' ').trim();
        if (!raw) return 'Moving Letters';
        return raw.length > 16 ? raw.slice(0, 16).trim() : raw;
    }, [element?.text]);

    const effects = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return TEXT_ANIMATIONS;
        return TEXT_ANIMATIONS.filter(
            (e) => e.label.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.unit.includes(q),
        );
    }, [query]);

    if (!isText) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8" style={{ background: '#0c0c15' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
                    <Type size={20} style={{ color: ACCENT }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#c0c0d8' }}>Select a text layer</p>
                <p className="text-xs max-w-xs" style={{ color: '#5a5a7a' }}>
                    Text animations split a text layer into letters or words and animate each one. Select a text element on the canvas to use them.
                </p>
            </div>
        );
    }

    const delay = element?.textAnimationDelay ?? 0;
    const speed = element?.textAnimationSpeed ?? 1;

    return (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-visible">
            {/* Left: effect gallery */}
            <div className="flex-1 flex flex-col min-w-0 min-h-[320px] md:min-h-0 md:border-r border-[#1a1a28]">
                <div className="px-4 py-3 shrink-0" style={{ background: '#0b0b14', borderBottom: '1px solid #1a1a28' }}>
                    <div className="relative">
                        <Search size={13} className="absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4a4a6a' }} />
                        <input
                            type="text"
                            placeholder="Search text animations…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full text-xs focus:outline-none"
                            style={{ background: '#13131e', border: '1px solid #222232', borderRadius: 8, padding: '7px 32px', color: '#c0c0d8' }}
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute" style={{ right: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a5a7a' }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                <div
                    className="flex-1 p-3 overflow-y-auto"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, alignContent: 'start', background: '#0c0c15' }}
                >
                    <button
                        onClick={() => onChange({ textAnimation: undefined })}
                        className="flex flex-col justify-center text-left transition"
                        style={{
                            height: 104,
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: !current ? '#1a1a28' : '#11111a',
                            border: `1px solid ${!current ? '#2e2e40' : '#1e1e2c'}`,
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold" style={{ color: '#a0a0b8' }}>None</span>
                            {!current && <Check size={13} style={{ color: ACCENT }} />}
                        </div>
                        <span className="text-[10px] mt-1" style={{ color: '#4a4a62' }}>No letter / word effect</span>
                    </button>

                    {effects.map((effect) => {
                        const selected = current === effect.id;
                        return (
                            <button
                                key={effect.id}
                                onClick={() => onChange({ textAnimation: effect.id })}
                                className="flex flex-col justify-between text-left transition overflow-hidden"
                                title={effect.description}
                                style={{
                                    height: 104,
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    background: selected ? `${ACCENT}12` : '#11111a',
                                    border: `1px solid ${selected ? ACCENT + '60' : '#1e1e2c'}`,
                                    boxShadow: selected ? `0 0 12px ${ACCENT}18` : 'none',
                                }}
                            >
                                <EffectPreview effect={effect} sample={sample} color={selected ? '#ffe1a0' : '#d8d8ea'} />
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold truncate" style={{ color: selected ? ACCENT : '#a0a0b8' }}>
                                        {String(TEXT_ANIMATIONS.indexOf(effect) + 1).padStart(2, '0')} · {effect.label}
                                    </span>
                                    <span className="text-[9px] uppercase shrink-0" style={{ color: '#4a4a62' }}>{effect.unit}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right: settings */}
            <div className="shrink-0 flex flex-col gap-4 p-4 md:overflow-y-auto w-full md:w-[250px] border-t md:border-t-0 border-[#1a1a28]" style={{ background: '#0b0b14' }}>
                <div>
                    <p className="text-[10px] uppercase font-semibold tracking-wider mb-2" style={{ color: '#5a5a7a' }}>Text effect</p>
                    <p className="text-sm font-bold" style={{ color: current ? ACCENT : '#6a6a8a' }}>
                        {TEXT_ANIMATIONS.find((e) => e.id === current)?.label || 'None'}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: '#5a5a7a' }}>
                        {TEXT_ANIMATIONS.find((e) => e.id === current)?.description || 'Pick an effect from the gallery.'}
                    </p>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <label className="text-[11px]" style={{ color: '#9090b0' }} title="Seconds from the banner start before the text effect begins">Start delay</label>
                        <span className="text-[11px]" style={{ color: '#c0c0d8' }}>{delay.toFixed(1)}s</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={15}
                        step={0.1}
                        value={delay}
                        disabled={!current}
                        onChange={(e) => onChange({ textAnimationDelay: Number(e.target.value) })}
                        className="w-full cursor-pointer"
                        style={{ accentColor: ACCENT }}
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <label className="text-[11px]" style={{ color: '#9090b0' }} title="Playback speed (1× = original Moving Letters timing)">Speed</label>
                        <span className="text-[11px]" style={{ color: '#c0c0d8' }}>{speed.toFixed(2)}×</span>
                    </div>
                    <input
                        type="range"
                        min={0.25}
                        max={4}
                        step={0.05}
                        value={speed}
                        disabled={!current}
                        onChange={(e) => onChange({ textAnimationSpeed: Number(e.target.value) })}
                        className="w-full cursor-pointer"
                        style={{ accentColor: ACCENT }}
                    />
                </div>

                <p className="text-[10px] leading-relaxed" style={{ color: '#4a4a6a' }}>
                    Effects run on the banner timeline. Scrub or play it to preview on the canvas. They also work with the layer's normal entrance / exit animations. Based on Moving Letters by Tobias Ahlin.
                </p>
            </div>
        </div>
    );
};
