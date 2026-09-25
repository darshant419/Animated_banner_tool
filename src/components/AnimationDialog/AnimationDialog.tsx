import React, { useState, useEffect, useMemo } from 'react';
import {
    X, RotateCcw, Sparkles, Search, Layers,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight,
    Dot, Check, Zap, FastForward, RefreshCw, ChevronRight,
} from 'lucide-react';
import { useDesignStore, type DesignElement } from '../../store/designStore';
import {
    ANIMISTA_ANIMATIONS,
    animationLabel,
} from '../../utils/animations';
import { applyStaggeredDelays, type StaggerOrder } from '../../utils/keyframes';

interface AnimationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'in' | 'out' | 'sequence';
}

// TheBrief-style color accents per animation type
const TAB_META = {
    in: { color: '#1bbfa7', bg: '#1bbfa715', border: '#1bbfa730', label: 'Entrance', icon: <Zap size={13} /> },
    out: { color: '#e4567d', bg: '#e4567d15', border: '#e4567d30', label: 'Exit', icon: <FastForward size={13} /> },
    sequence: { color: '#9b7df8', bg: '#9b7df815', border: '#9b7df830', label: 'Sequence', icon: <Layers size={13} /> },
};

const EASING_PRESETS = [
    { id: 'power2.out', label: 'Smooth' },
    { id: 'power3.out', label: 'Snappy' },
    { id: 'back.out', label: 'Bounce' },
    { id: 'elastic.out', label: 'Spring' },
    { id: 'bounce.out', label: 'Rubber' },
    { id: 'expo.out', label: 'Expo' },
    { id: 'sine.inOut', label: 'Sine' },
    { id: 'linear', label: 'Linear' },
];

export const AnimationDialog: React.FC<AnimationDialogProps> = ({
    isOpen,
    onClose,
    initialTab = 'in',
}) => {
    const {
        elements,
        selectedId,
        updateElement,
    } = useDesignStore();

    const selectedElement = elements.find((el) => el.id === selectedId);

    const [activeTab, setActiveTab] = useState<'in' | 'out' | 'sequence'>(initialTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [staggerGap, setStaggerGap] = useState(0.2);
    const [staggerOrder, setStaggerOrder] = useState<StaggerOrder>('bottomToTop');
    const [staggerTarget, setStaggerTarget] = useState<'enter' | 'main'>('enter');

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    const currentPreset = useMemo(() => {
        if (!selectedElement) return 'none';
        if (activeTab === 'in') return selectedElement.enterAnimation || selectedElement.animation || 'none';
        if (activeTab === 'out') return selectedElement.exitAnimation || 'none';
        return 'none';
    }, [selectedElement, activeTab]);

    const currentDuration = selectedElement?.animationDuration || 0.8;
    const currentDelay = activeTab === 'in'
        ? (selectedElement?.enterDelay ?? selectedElement?.animationDelay ?? 0)
        : (selectedElement?.exitDelay || 0);

    const allPresets = useMemo(() => Object.values(ANIMISTA_ANIMATIONS), []);

    const tabPresets = useMemo(() => {
        return allPresets.filter((p) => {
            if (activeTab === 'in') return p.type === 'in' || (!p.type && !p.loop);
            if (activeTab === 'out') return p.type === 'out';
            return true;
        });
    }, [allPresets, activeTab]);

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        tabPresets.forEach((p) => cats.add(p.category));
        return ['All', ...Array.from(cats)];
    }, [tabPresets]);

    const filteredPresets = useMemo(() => {
        return tabPresets.filter((p) => {
            const matchesSearch =
                searchQuery === '' ||
                p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [tabPresets, searchQuery, selectedCategory]);

    const handleSelectPreset = (presetId: string) => {
        if (!selectedElement) return;
        if (activeTab === 'in') {
            updateElement(selectedElement.id, {
                enterAnimation: presetId === 'none' ? undefined : presetId,
                animation: presetId === 'none' ? undefined : presetId,
                animationLoop: false,
            });
        } else if (activeTab === 'out') {
            updateElement(selectedElement.id, {
                exitAnimation: presetId === 'none' ? undefined : presetId,
            });
        }
    };

    const handleDirectionSelect = (dir: string) => {
        if (!selectedElement || currentPreset === 'none') return;
        let baseName = currentPreset;
        const dirKeys = ['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br', 'center', 'up', 'down'];
        dirKeys.forEach((k) => {
            baseName = baseName.replace(new RegExp(`-${k}$`), '').replace(new RegExp(`-${k}-`), '-');
        });
        let newPreset = `${baseName}-${dir}`;
        if (!ANIMISTA_ANIMATIONS[newPreset]) {
            if (currentPreset.startsWith('slide-in')) newPreset = `slide-in-${dir}`;
            else if (currentPreset.startsWith('slide-out')) newPreset = `slide-out-${dir}`;
            else if (currentPreset.startsWith('fade-in')) newPreset = dir === 'center' ? 'fade-in' : `fade-in-${dir}`;
            else if (currentPreset.startsWith('scale-in')) newPreset = `scale-in-${dir}`;
            else if (currentPreset.startsWith('bounce-in')) newPreset = `bounce-in-${dir}`;
            else if (currentPreset.startsWith('kenburns')) newPreset = `kenburns-${dir}`;
        }
        if (ANIMISTA_ANIMATIONS[newPreset]) handleSelectPreset(newPreset);
    };

    const handleApplyStagger = () => {
        const updates = applyStaggeredDelays(elements, staggerGap, staggerTarget === 'enter', staggerOrder);
        updates.forEach((u) => {
            if (u.id) {
                if (staggerTarget === 'enter') updateElement(u.id, { enterDelay: u.enterDelay });
                else updateElement(u.id, { animationDelay: u.animationDelay });
            }
        });
    };

    const handleApplyToAll = () => {
        if (!selectedElement || currentPreset === 'none') return;
        elements.forEach((el) => {
            if (activeTab === 'in') {
                updateElement(el.id, { enterAnimation: currentPreset, animation: currentPreset, animationDuration: currentDuration });
            } else if (activeTab === 'out') {
                updateElement(el.id, { exitAnimation: currentPreset });
            }
        });
    };

    if (!isOpen) return null;

    const accent = TAB_META[activeTab] ?? TAB_META.in;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="flex flex-col overflow-hidden"
                style={{
                    width: 960,
                    maxWidth: '95vw',
                    height: '88vh',
                    maxHeight: 780,
                    background: '#0f0f18',
                    border: '1px solid #1e1e2e',
                    borderRadius: 16,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                    color: '#d0d0e0',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ──────────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-5 shrink-0"
                    style={{ height: 60, background: '#0b0b14', borderBottom: '1px solid #1a1a28' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{
                                background: `linear-gradient(135deg, ${accent.color}30, ${accent.color}10)`,
                                border: `1px solid ${accent.border}`,
                            }}
                        >
                            <Sparkles size={17} style={{ color: accent.color }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold" style={{ color: '#e0e0f0', letterSpacing: '-0.01em' }}>
                                    Animation Studio
                                </h2>
                                {selectedElement ? (
                                    <span
                                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                        style={{
                                            background: '#1a1a28',
                                            border: '1px solid #252535',
                                            color: '#8080a0',
                                        }}
                                    >
                                        {selectedElement.name || selectedElement.type}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium" style={{ color: '#f0a050' }}>
                                        Select a layer first
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: '#4a4a6a' }}>
                                Entrance · Exit · Emphasis · Stagger sequences
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg transition"
                        style={{ color: '#5a5a7a' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#d0d0e0'; (e.currentTarget as HTMLElement).style.background = '#1a1a28'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5a5a7a'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Tab nav ──────────────────────────────────────────────── */}
                <div
                    className="flex items-center px-5 gap-1 shrink-0"
                    style={{ height: 46, background: '#0d0d16', borderBottom: '1px solid #1a1a28' }}
                >
                    {(['in', 'out', 'sequence'] as const).map((t) => {
                        const meta = TAB_META[t];
                        const active = activeTab === t;
                        return (
                            <button
                                key={t}
                                onClick={() => { setActiveTab(t); setSelectedCategory('All'); setSearchQuery(''); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                style={{
                                    background: active ? meta.bg : 'transparent',
                                    border: `1px solid ${active ? meta.border : 'transparent'}`,
                                    color: active ? meta.color : '#5a5a7a',
                                }}
                            >
                                <span style={{ color: active ? meta.color : '#4a4a6a' }}>{meta.icon}</span>
                                {meta.label}
                                {active && (
                                    <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: meta.color }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Content ──────────────────────────────────────────────── */}
                {activeTab !== 'sequence' ? (
                    <div className="flex-1 flex min-h-0">
                        {/* Left: search + grid */}
                        <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '1px solid #1a1a28' }}>
                            {/* Search + categories */}
                            <div
                                className="px-4 py-3 space-y-2 shrink-0"
                                style={{ background: '#0b0b14', borderBottom: '1px solid #1a1a28' }}
                            >
                                {/* Search */}
                                <div className="relative">
                                    <Search
                                        size={13}
                                        className="absolute"
                                        style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4a4a6a' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search animations…"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full text-xs focus:outline-none"
                                        style={{
                                            background: '#13131e',
                                            border: '1px solid #222232',
                                            borderRadius: 8,
                                            padding: '7px 32px',
                                            color: '#c0c0d8',
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = accent.color)}
                                        onBlur={(e) => (e.target.style.borderColor = '#222232')}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute"
                                            style={{ right: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a5a7a' }}
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                {/* Category chips */}
                                <div className="flex items-center gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                                    {availableCategories.map((cat) => {
                                        const active = selectedCategory === cat;
                                        return (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition"
                                                style={{
                                                    background: active ? `${accent.color}20` : '#13131e',
                                                    border: `1px solid ${active ? accent.border : '#1e1e2e'}`,
                                                    color: active ? accent.color : '#5a5a7a',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preset grid */}
                            <div
                                className="flex-1 p-3 overflow-y-auto"
                                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, alignContent: 'start', background: '#0c0c15' }}
                            >
                                {/* None card */}
                                <button
                                    onClick={() => handleSelectPreset('none')}
                                    className="flex flex-col justify-between text-left transition"
                                    style={{
                                        height: 76,
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        background: currentPreset === 'none' ? '#1a1a28' : '#11111a',
                                        border: `1px solid ${currentPreset === 'none' ? '#2e2e40' : '#1e1e2c'}`,
                                    }}
                                    onMouseEnter={(e) => { if (currentPreset !== 'none') (e.currentTarget as HTMLElement).style.borderColor = '#2e2e40'; }}
                                    onMouseLeave={(e) => { if (currentPreset !== 'none') (e.currentTarget as HTMLElement).style.borderColor = '#1e1e2c'; }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold" style={{ color: '#a0a0b8' }}>None</span>
                                        {currentPreset === 'none' && <Check size={13} style={{ color: accent.color }} />}
                                    </div>
                                    <span className="text-[10px]" style={{ color: '#4a4a62' }}>No preset / keyframe only</span>
                                </button>

                                {filteredPresets.map((preset) => {
                                    const isSelected = currentPreset === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handleSelectPreset(preset.id)}
                                            className="flex flex-col justify-between text-left transition relative"
                                            style={{
                                                height: 76,
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                background: isSelected
                                                    ? `${accent.color}12`
                                                    : '#11111a',
                                                border: `1px solid ${isSelected ? accent.color + '50' : '#1e1e2c'}`,
                                                boxShadow: isSelected ? `0 0 12px ${accent.color}15` : 'none',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    (e.currentTarget as HTMLElement).style.borderColor = accent.color + '35';
                                                    (e.currentTarget as HTMLElement).style.background = '#15151f';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    (e.currentTarget as HTMLElement).style.borderColor = '#1e1e2c';
                                                    (e.currentTarget as HTMLElement).style.background = '#11111a';
                                                }
                                            }}
                                        >
                                            {/* Selected accent strip */}
                                            {isSelected && (
                                                <div
                                                    className="absolute top-0 left-0 bottom-0 rounded-l-[9px]"
                                                    style={{ width: 3, background: accent.color }}
                                                />
                                            )}

                                            <div className="flex items-center justify-between gap-1">
                                                <span
                                                    className="text-xs font-bold truncate"
                                                    style={{ color: isSelected ? accent.color : '#b0b0c8' }}
                                                >
                                                    {preset.label}
                                                </span>
                                                {isSelected && <Check size={12} style={{ color: accent.color, flexShrink: 0 }} />}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px]" style={{ color: '#4a4a62' }}>{preset.category}</span>
                                                {preset.loop && (
                                                    <span
                                                        className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                                                        style={{ background: '#9b7df815', color: '#9b7df8', border: '1px solid #9b7df830' }}
                                                    >
                                                        Loop
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                                {filteredPresets.length === 0 && (
                                    <div
                                        className="col-span-3 text-center py-12 text-xs"
                                        style={{ color: '#3a3a52' }}
                                    >
                                        No presets match "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: controls */}
                        <div
                            className="shrink-0 flex flex-col overflow-y-auto"
                            style={{ width: 280, background: '#0d0d16', gap: 0 }}
                        >
                            {/* Direction pad */}
                            <div className="p-4" style={{ borderBottom: '1px solid #1a1a28' }}>
                                <label
                                    className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
                                    style={{ color: '#5a5a7a' }}
                                >
                                    Direction
                                </label>
                                <div
                                    className="grid"
                                    style={{
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: 4,
                                        background: '#0a0a12',
                                        border: '1px solid #1a1a28',
                                        borderRadius: 10,
                                        padding: 6,
                                    }}
                                >
                                    {[
                                        { id: 'tl', icon: <ArrowUpLeft size={13} />, label: 'Top-Left' },
                                        { id: 'top', icon: <ArrowUp size={13} />, label: 'Top' },
                                        { id: 'tr', icon: <ArrowUpRight size={13} />, label: 'Top-Right' },
                                        { id: 'left', icon: <ArrowLeft size={13} />, label: 'Left' },
                                        { id: 'center', icon: <Dot size={17} />, label: 'Center' },
                                        { id: 'right', icon: <ArrowRight size={13} />, label: 'Right' },
                                        { id: 'bl', icon: <ArrowDownLeft size={13} />, label: 'Bottom-Left' },
                                        { id: 'bottom', icon: <ArrowDown size={13} />, label: 'Bottom' },
                                        { id: 'br', icon: <ArrowDownRight size={13} />, label: 'Bottom-Right' },
                                    ].map((d) => (
                                        <button
                                            key={d.id}
                                            onClick={() => handleDirectionSelect(d.id)}
                                            title={d.label}
                                            className="flex items-center justify-center rounded-lg transition"
                                            style={{
                                                height: 34,
                                                background: '#13131e',
                                                border: '1px solid #1e1e2e',
                                                color: '#5a5a7a',
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = `${accent.color}20`;
                                                (e.currentTarget as HTMLElement).style.color = accent.color;
                                                (e.currentTarget as HTMLElement).style.borderColor = accent.border;
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = '#13131e';
                                                (e.currentTarget as HTMLElement).style.color = '#5a5a7a';
                                                (e.currentTarget as HTMLElement).style.borderColor = '#1e1e2e';
                                            }}
                                        >
                                            {d.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Timing */}
                            <div className="p-4 space-y-4" style={{ borderBottom: '1px solid #1a1a28' }}>
                                <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: '#5a5a7a' }}>
                                    Timing
                                </label>

                                {/* Duration */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs" style={{ color: '#8a8aaa' }}>Duration</span>
                                        <span className="text-xs font-bold font-mono" style={{ color: accent.color }}>
                                            {currentDuration}s
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1" max="5.0" step="0.1"
                                        value={currentDuration}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (selectedElement) updateElement(selectedElement.id, { animationDuration: val });
                                        }}
                                        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                                        style={{ accentColor: accent.color }}
                                    />
                                    <div className="flex gap-1">
                                        {[0.3, 0.5, 0.8, 1.2, 2.0].map((sec) => (
                                            <button
                                                key={sec}
                                                onClick={() => {
                                                    if (selectedElement) updateElement(selectedElement.id, { animationDuration: sec });
                                                }}
                                                className="flex-1 py-1 text-[10px] font-medium rounded transition"
                                                style={{
                                                    background: currentDuration === sec ? `${accent.color}20` : '#13131e',
                                                    border: `1px solid ${currentDuration === sec ? accent.border : '#1e1e2e'}`,
                                                    color: currentDuration === sec ? accent.color : '#5a5a7a',
                                                }}
                                            >
                                                {sec}s
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Delay */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs" style={{ color: '#8a8aaa' }}>
                                            {activeTab === 'out' ? 'Gap After In' : 'Delay'}
                                        </span>
                                        <span className="text-xs font-bold font-mono" style={{ color: '#8a8aaa' }}>
                                            {currentDelay}s
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="5.0" step="0.1"
                                        value={currentDelay}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (selectedElement) {
                                                if (activeTab === 'in') updateElement(selectedElement.id, { enterDelay: val });
                                                else if (activeTab === 'out') updateElement(selectedElement.id, { exitDelay: val });
                                                else updateElement(selectedElement.id, { animationDelay: val });
                                            }
                                        }}
                                        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                                        style={{ accentColor: '#8a8aaa' }}
                                    />
                                </div>

                                {/* Easing */}
                                <div className="space-y-2">
                                    <span className="text-xs block" style={{ color: '#8a8aaa' }}>Easing</span>
                                    <div className="grid grid-cols-4 gap-1">
                                        {EASING_PRESETS.map((e) => {
                                            const curEase = selectedElement?.animationDuration ? 'power2.out' : 'power2.out'; // placeholder
                                            return (
                                                <button
                                                    key={e.id}
                                                    className="py-1 text-[10px] rounded transition"
                                                    style={{
                                                        background: '#13131e',
                                                        border: '1px solid #1e1e2e',
                                                        color: '#5a5a7a',
                                                    }}
                                                    onMouseEnter={(ev) => {
                                                        (ev.currentTarget as HTMLElement).style.background = `${accent.color}20`;
                                                        (ev.currentTarget as HTMLElement).style.color = accent.color;
                                                    }}
                                                    onMouseLeave={(ev) => {
                                                        (ev.currentTarget as HTMLElement).style.background = '#13131e';
                                                        (ev.currentTarget as HTMLElement).style.color = '#5a5a7a';
                                                    }}
                                                    title={e.id}
                                                >
                                                    {e.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Batch actions */}
                            <div className="p-4 space-y-2 mt-auto">
                                <button
                                    onClick={handleApplyToAll}
                                    disabled={!selectedElement || currentPreset === 'none'}
                                    className="w-full py-2 text-xs font-semibold rounded-xl transition"
                                    style={{
                                        background: '#13131e',
                                        border: '1px solid #1e1e2e',
                                        color: '#8a8aaa',
                                    }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1a1a28'; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#13131e'; }}
                                >
                                    Apply Style to All Layers
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Sequence / Stagger tab ──────────────────────────── */
                    <div
                        className="flex-1 overflow-y-auto"
                        style={{ background: '#0c0c15', padding: 24 }}
                    >
                        <div className="mb-5">
                            <h3 className="text-sm font-bold mb-1" style={{ color: '#d0d0e8' }}>
                                Layer Sequencer & Auto-Stagger
                            </h3>
                            <p className="text-xs" style={{ color: '#5a5a7a' }}>
                                Cascade all banner layers so elements enter smoothly one after another.
                            </p>
                        </div>

                        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            {/* Config */}
                            <div
                                className="p-5 space-y-4 rounded-2xl"
                                style={{ background: '#0f0f1c', border: '1px solid #1e1e2e' }}
                            >
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5a5a7a' }}>
                                    Configuration
                                </h4>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs" style={{ color: '#8a8aaa' }}>Stagger Gap</label>
                                        <span className="text-xs font-bold font-mono" style={{ color: '#9b7df8' }}>{staggerGap}s</span>
                                    </div>
                                    <input
                                        type="range" min="0.05" max="0.8" step="0.05"
                                        value={staggerGap}
                                        onChange={(e) => setStaggerGap(parseFloat(e.target.value))}
                                        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                                        style={{ accentColor: '#9b7df8' }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs block" style={{ color: '#8a8aaa' }}>Cascade Order</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'bottomToTop', label: 'Bottom → Top' },
                                            { id: 'topToBottom', label: 'Top → Bottom' },
                                            { id: 'centerOut', label: 'Center Out' },
                                            { id: 'random', label: 'Random' },
                                        ].map((ord) => (
                                            <button
                                                key={ord.id}
                                                onClick={() => setStaggerOrder(ord.id as StaggerOrder)}
                                                className="px-3 py-2 rounded-xl text-xs font-medium transition"
                                                style={{
                                                    background: staggerOrder === ord.id ? '#9b7df820' : '#13131e',
                                                    border: `1px solid ${staggerOrder === ord.id ? '#9b7df840' : '#1e1e2e'}`,
                                                    color: staggerOrder === ord.id ? '#9b7df8' : '#6a6a8a',
                                                }}
                                            >
                                                {ord.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs block" style={{ color: '#8a8aaa' }}>Target</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'enter', label: 'Entrance Delay' },
                                            { id: 'main', label: 'Main Anim' },
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setStaggerTarget(t.id as 'enter' | 'main')}
                                                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition"
                                                style={{
                                                    background: staggerTarget === t.id ? '#9b7df820' : '#13131e',
                                                    border: `1px solid ${staggerTarget === t.id ? '#9b7df840' : '#1e1e2e'}`,
                                                    color: staggerTarget === t.id ? '#9b7df8' : '#6a6a8a',
                                                }}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleApplyStagger}
                                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                                    style={{
                                        background: 'linear-gradient(135deg, #9b7df8, #7c5de8)',
                                        color: '#fff',
                                        boxShadow: '0 4px 16px #9b7df830',
                                    }}
                                >
                                    <Sparkles size={13} />
                                    Sequence All Layers
                                </button>
                            </div>

                            {/* Layer preview */}
                            <div
                                className="p-5 rounded-2xl flex flex-col"
                                style={{ background: '#0f0f1c', border: '1px solid #1e1e2e' }}
                            >
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#5a5a7a' }}>
                                    Layers ({elements.length})
                                </h4>

                                <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                                    {elements.map((el, i) => (
                                        <div
                                            key={el.id}
                                            className="flex items-center justify-between p-2 rounded-lg text-xs"
                                            style={{
                                                background: '#0b0b14',
                                                border: '1px solid #1a1a28',
                                            }}
                                        >
                                            <span className="font-medium truncate max-w-[120px]" style={{ color: '#b0b0c8' }}>
                                                {i + 1}. {el.name || el.type}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px]" style={{ color: '#9b7df8' }}>
                                                    +{(el.enterDelay || 0).toFixed(2)}s
                                                </span>
                                                <span className="truncate max-w-[70px] text-[9px]" style={{ color: '#4a4a62' }}>
                                                    {animationLabel(el.enterAnimation || el.animation || 'none')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => elements.forEach((el) => updateElement(el.id, { enterDelay: 0, animationDelay: 0 }))}
                                    className="mt-4 w-full py-2 rounded-xl text-xs font-medium transition"
                                    style={{ background: '#13131e', border: '1px solid #1e1e2e', color: '#6a6a8a' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#a0a0c0')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#6a6a8a')}
                                >
                                    Reset All Delays
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Footer ───────────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-5 shrink-0"
                    style={{ height: 52, background: '#0b0b14', borderTop: '1px solid #1a1a28' }}
                >
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#5a5a7a' }}>
                        <span>Active:</span>
                        <span
                            className="font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: '#13131e', border: '1px solid #1e1e2e', color: '#c0c0d8' }}
                        >
                            {animationLabel(currentPreset)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSelectPreset('none')}
                            className="px-4 py-1.5 rounded-xl text-xs transition"
                            style={{ color: '#6a6a8a' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c0c0d8'; (e.currentTarget as HTMLElement).style.background = '#1a1a28'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6a6a8a'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                            Remove
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-1.5 rounded-xl text-xs font-bold transition"
                            style={{
                                background: accent.color,
                                color: '#000',
                                boxShadow: `0 2px 12px ${accent.color}40`,
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
