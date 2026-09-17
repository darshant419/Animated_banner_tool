import React, { useState, useEffect, useMemo } from 'react';
import {
    X, RotateCcw, Sparkles, Search, Layers,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight,
    Dot, Check, Zap, FastForward
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
    initialTab?: 'in' | 'loop' | 'out' | 'hover' | 'sequence';
}

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

    const [activeTab, setActiveTab] = useState<'in' | 'loop' | 'out' | 'hover' | 'sequence'>(initialTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Stagger settings
    const [staggerGap, setStaggerGap] = useState(0.2);
    const [staggerOrder, setStaggerOrder] = useState<StaggerOrder>('bottomToTop');
    const [staggerTarget, setStaggerTarget] = useState<'enter' | 'main'>('enter');

    // Sync active tab when initialTab changes
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // Current animation values for the selected element
    const currentPreset = useMemo(() => {
        if (!selectedElement) return 'none';
        if (activeTab === 'in') return selectedElement.enterAnimation || selectedElement.animation || 'none';
        if (activeTab === 'out') return selectedElement.exitAnimation || 'none';
        if (activeTab === 'loop') return selectedElement.animationLoop ? (selectedElement.animation || 'none') : 'none';
        if (activeTab === 'hover') return selectedElement.hoverAnimation || 'none';
        return 'none';
    }, [selectedElement, activeTab]);

    const currentDuration = selectedElement?.animationDuration || 0.8;
    // Delay/gap semantics per tab: entrance delay for "in", the GAP between the
    // entrance/main animation and the exit for "out", generic delay otherwise.
    const currentDelay = activeTab === 'in'
        ? (selectedElement?.enterDelay || 0)
        : activeTab === 'out'
            ? (selectedElement?.exitDelay || 0)
            : (selectedElement?.animationDelay || 0);

    // All presets list
    const allPresets = useMemo(() => {
        return Object.values(ANIMISTA_ANIMATIONS);
    }, []);

    // Presets for the current tab
    const tabPresets = useMemo(() => {
        if (activeTab === 'hover') return [];
        return allPresets.filter((p) => {
            if (activeTab === 'in') return p.type === 'in' || (!p.type && !p.loop);
            if (activeTab === 'loop') return p.type === 'loop' || p.loop === true;
            if (activeTab === 'out') return p.type === 'out';
            return true;
        });
    }, [allPresets, activeTab]);

    // Categories in this tab
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        tabPresets.forEach((p) => cats.add(p.category));
        return ['All', ...Array.from(cats)];
    }, [tabPresets]);

    // Filtered presets based on search & category
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

    // Apply animation preset to selected element
    const handleSelectPreset = (presetId: string) => {
        if (!selectedElement) return;

        if (activeTab === 'in') {
            updateElement(selectedElement.id, {
                enterAnimation: presetId === 'none' ? undefined : presetId,
                animation: undefined,
                animationLoop: false,
            });
        } else if (activeTab === 'loop') {
            updateElement(selectedElement.id, {
                animation: presetId === 'none' ? undefined : presetId,
                animationLoop: presetId !== 'none',
            });
        } else if (activeTab === 'out') {
            updateElement(selectedElement.id, {
                exitAnimation: presetId === 'none' ? undefined : presetId,
            });
        } else if (activeTab === 'hover') {
            updateElement(selectedElement.id, {
                hoverAnimation: presetId as DesignElement['hoverAnimation'],
            });
        }
    };

    // Apply direction variation
    const handleDirectionSelect = (dir: string) => {
        if (!selectedElement || currentPreset === 'none') return;

        let baseName = currentPreset;
        // Strip existing direction suffix if present
        const dirKeys = ['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br', 'center', 'up', 'down'];
        dirKeys.forEach((k) => {
            baseName = baseName.replace(new RegExp(`-${k}$`), '').replace(new RegExp(`-${k}-`), '-');
        });

        // Form new preset name
        let newPreset = `${baseName}-${dir}`;
        if (!ANIMISTA_ANIMATIONS[newPreset]) {
            // Try matching slide/fade patterns
            if (currentPreset.startsWith('slide-in')) newPreset = `slide-in-${dir}`;
            else if (currentPreset.startsWith('slide-out')) newPreset = `slide-out-${dir}`;
            else if (currentPreset.startsWith('fade-in')) newPreset = dir === 'center' ? 'fade-in' : `fade-in-${dir}`;
            else if (currentPreset.startsWith('scale-in')) newPreset = `scale-in-${dir}`;
            else if (currentPreset.startsWith('bounce-in')) newPreset = `bounce-in-${dir}`;
            else if (currentPreset.startsWith('kenburns')) newPreset = `kenburns-${dir}`;
        }

        if (ANIMISTA_ANIMATIONS[newPreset]) {
            handleSelectPreset(newPreset);
        }
    };

    // Stagger / Sequence layers action
    const handleApplyStagger = () => {
        const updates = applyStaggeredDelays(elements, staggerGap, staggerTarget === 'enter', staggerOrder);
        updates.forEach((u) => {
            if (u.id) {
                if (staggerTarget === 'enter') updateElement(u.id, { enterDelay: u.enterDelay });
                else updateElement(u.id, { animationDelay: u.animationDelay });
            }
        });
    };

    // Apply current animation to all layers
    const handleApplyToAll = () => {
        if (!selectedElement || currentPreset === 'none') return;
        elements.forEach((el) => {
            if (activeTab === 'in') {
                updateElement(el.id, { enterAnimation: currentPreset, animation: currentPreset, animationDuration: currentDuration });
            } else if (activeTab === 'loop') {
                updateElement(el.id, { animation: currentPreset, animationLoop: true, animationDuration: currentDuration });
            } else if (activeTab === 'out') {
                updateElement(el.id, { exitAnimation: currentPreset });
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-[#15151c] border border-[#2a2a35] rounded-2xl shadow-2xl w-[920px] max-w-[95vw] h-[86vh] max-h-[750px] flex flex-col overflow-hidden text-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. Header */}
                <div className="px-6 py-4 border-b border-[#232330] flex items-center justify-between shrink-0 bg-[#121217]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-white tracking-tight">Animation Studio</h2>
                                {selectedElement ? (
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#232330] text-gray-300 border border-[#2e2e3d] font-medium">
                                        {selectedElement.name || selectedElement.type}
                                    </span>
                                ) : (
                                    <span className="text-xs text-amber-400 font-medium">Select a layer on canvas</span>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Professional entrance, emphasis loops, exit transitions & interactive effects
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#232330] rounded-lg transition"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* 2. Main Tab Navigation */}
                <div className="px-6 border-b border-[#232330] bg-[#171720] flex items-center justify-between shrink-0">
                    <div className="flex gap-1 overflow-x-auto py-2">
                        {[
                            { id: 'in', label: 'Entrance (In)', dot: 'bg-amber-500', icon: <Zap size={14} /> },
                            { id: 'loop', label: 'Emphasis & Loop', dot: 'bg-purple-500', icon: <RotateCcw size={14} /> },
                            { id: 'out', label: 'Exit (Out)', dot: 'bg-red-500', icon: <FastForward size={14} /> },
                            { id: 'sequence', label: 'Layer Sequencer', dot: 'bg-emerald-500', icon: <Layers size={14} /> },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setActiveTab(t.id as any);
                                    setSelectedCategory('All');
                                    setSearchQuery('');
                                }}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    activeTab === t.id
                                        ? 'bg-[#232332] text-white shadow-inner border border-[#333346]'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Tab Contents */}
                {activeTab !== 'sequence' && activeTab !== 'hover' ? (
                    <div className="flex-1 flex min-h-0">
                        {/* Left Side: Category Filter & Grid */}
                        <div className="flex-1 flex flex-col border-r border-[#232330] min-w-0">
                            {/* Search & Category Chips */}
                            <div className="p-4 border-b border-[#232330] space-y-3 bg-[#13131a]">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search animations (fade, slide, bounce, pop, 3d, blur...)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#1c1c26] border border-[#2a2a38] rounded-xl pl-9 pr-8 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                                    {availableCategories.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                                                selectedCategory === cat
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                                    : 'bg-[#1c1c26] text-gray-400 border border-[#262635] hover:text-gray-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Presets Grid */}
                            <div className="flex-1 p-4 overflow-y-auto grid grid-cols-3 gap-2.5 bg-[#121217]">
                                {/* None Card */}
                                <button
                                    onClick={() => handleSelectPreset('none')}
                                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-[82px] ${
                                        currentPreset === 'none'
                                            ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500'
                                            : 'border-[#232330] bg-[#181822] hover:border-[#3a3a4c]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-200">None</span>
                                        {currentPreset === 'none' && <Check size={14} className="text-red-400" />}
                                    </div>
                                    <span className="text-[10px] text-gray-500">No animation / keyframe only</span>
                                </button>

                                {filteredPresets.map((preset) => {
                                    const isSelected = currentPreset === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handleSelectPreset(preset.id)}
                                            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-[82px] relative group ${
                                                isSelected
                                                    ? 'border-red-500 bg-red-500/15 ring-1 ring-red-500 shadow-lg shadow-red-500/10'
                                                    : 'border-[#232330] bg-[#181822] hover:border-red-500/50 hover:bg-[#1f1f2d]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-xs font-bold text-gray-100 truncate group-hover:text-red-400 transition">
                                                    {preset.label}
                                                </span>
                                                {isSelected && <Check size={14} className="text-red-400 shrink-0" />}
                                            </div>
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-gray-400">{preset.category}</span>
                                                {preset.loop && (
                                                    <span className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-medium">Loop</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Side: Direction Pad & Timing Parameters */}
                        <div className="w-80 p-5 bg-[#161620] overflow-y-auto space-y-5 shrink-0">
                            {/* Direction Matrix */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide flex items-center justify-between">
                                    <span>Direction</span>
                                    <span className="text-[10px] text-gray-500 font-normal">8-way position</span>
                                </label>
                                <div className="grid grid-cols-3 gap-1.5 bg-[#121218] p-2 rounded-xl border border-[#232330]">
                                    {[
                                        { id: 'tl', icon: <ArrowUpLeft size={14} />, label: 'Top-Left' },
                                        { id: 'top', icon: <ArrowUp size={14} />, label: 'Top' },
                                        { id: 'tr', icon: <ArrowUpRight size={14} />, label: 'Top-Right' },
                                        { id: 'left', icon: <ArrowLeft size={14} />, label: 'Left' },
                                        { id: 'center', icon: <Dot size={18} />, label: 'Center' },
                                        { id: 'right', icon: <ArrowRight size={14} />, label: 'Right' },
                                        { id: 'bl', icon: <ArrowDownLeft size={14} />, label: 'Bottom-Left' },
                                        { id: 'bottom', icon: <ArrowDown size={14} />, label: 'Bottom' },
                                        { id: 'br', icon: <ArrowDownRight size={14} />, label: 'Bottom-Right' },
                                    ].map((d) => (
                                        <button
                                            key={d.id}
                                            onClick={() => handleDirectionSelect(d.id)}
                                            title={d.label}
                                            className="h-8 rounded-lg bg-[#1c1c27] hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition border border-[#272737]"
                                        >
                                            {d.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration & Delay */}
                            <div className="space-y-4 border-t border-[#232330] pt-4">
                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide block">
                                    Timing
                                </label>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Duration</span>
                                        <span className="font-semibold text-red-400">{currentDuration}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="5.0"
                                        step="0.1"
                                        value={currentDuration}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (selectedElement) {
                                                updateElement(selectedElement.id, { animationDuration: val });
                                            }
                                        }}
                                        className="w-full h-1.5 bg-[#232332] rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                    <div className="flex gap-1 pt-1">
                                        {[0.3, 0.5, 0.8, 1.2, 2.0].map((sec) => (
                                            <button
                                                key={sec}
                                                onClick={() => {
                                                    if (selectedElement) {
                                                        updateElement(selectedElement.id, { animationDuration: sec });
                                                    }
                                                }}
                                                className={`flex-1 py-1 rounded text-[10px] font-medium border transition ${
                                                    currentDuration === sec
                                                        ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                                        : 'bg-[#1a1a24] text-gray-400 border-[#272737] hover:text-white'
                                                }`}
                                            >
                                                {sec}s
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span
                                            className="text-gray-400"
                                            title={activeTab === 'out'
                                                ? 'Gap (seconds) between the end of the entrance/main animation and the start of the exit animation'
                                                : 'Delay (seconds) before the animation begins'}
                                        >
                                            {activeTab === 'out' ? 'Gap After Entrance' : 'Delay'}
                                        </span>
                                        <span className="font-semibold text-gray-200">{currentDelay}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5.0"
                                        step="0.1"
                                        value={currentDelay}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (selectedElement) {
                                                if (activeTab === 'in') updateElement(selectedElement.id, { enterDelay: val });
                                                else if (activeTab === 'out') updateElement(selectedElement.id, { exitDelay: val });
                                                else updateElement(selectedElement.id, { animationDelay: val });
                                            }
                                        }}
                                        className="w-full h-1.5 bg-[#232332] rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                </div>
                            </div>

                            {/* Batch Actions */}
                            <div className="border-t border-[#232330] pt-4 space-y-2">
                                <button
                                    onClick={handleApplyToAll}
                                    disabled={!selectedElement || currentPreset === 'none'}
                                    className="w-full py-2 bg-[#20202c] hover:bg-[#282838] border border-[#2e2e40] text-gray-200 rounded-xl text-xs font-semibold transition disabled:opacity-30"
                                >
                                    Apply Style to All Layers
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Layer Sequencer / Stagger Tab */
                    <div className="flex-1 p-6 overflow-y-auto bg-[#13131a] space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-1">Layer Sequencer & Auto-Stagger</h3>
                            <p className="text-xs text-gray-400">
                                Automatically cascade and sequence all banner layers so elements enter smoothly one after another.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4 bg-[#181824] p-5 rounded-2xl border border-[#262635]">
                                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Sequence Configuration</h4>

                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 block">Stagger Gap Between Layers</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="0.05"
                                            max="0.8"
                                            step="0.05"
                                            value={staggerGap}
                                            onChange={(e) => setStaggerGap(parseFloat(e.target.value))}
                                            className="flex-1 h-1.5 bg-[#252535] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                        <span className="text-xs font-bold text-emerald-400 w-12 text-right">{staggerGap}s</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 block">Cascade Order</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'bottomToTop', label: 'Bottom to Top' },
                                            { id: 'topToBottom', label: 'Top to Bottom' },
                                            { id: 'centerOut', label: 'Center Outward' },
                                            { id: 'random', label: 'Random Shuffle' },
                                        ].map((ord) => (
                                            <button
                                                key={ord.id}
                                                onClick={() => setStaggerOrder(ord.id as any)}
                                                className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                                                    staggerOrder === ord.id
                                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                                                        : 'bg-[#1c1c28] text-gray-400 border-[#2a2a3c] hover:text-white'
                                                }`}
                                            >
                                                {ord.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 block">Target Delay</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStaggerTarget('enter')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                                                staggerTarget === 'enter'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                                                    : 'bg-[#1c1c28] text-gray-400 border-[#2a2a3c]'
                                            }`}
                                        >
                                            Entrance Delay
                                        </button>
                                        <button
                                            onClick={() => setStaggerTarget('main')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                                                staggerTarget === 'main'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                                                    : 'bg-[#1c1c28] text-gray-400 border-[#2a2a3c]'
                                            }`}
                                        >
                                            Main Anim Delay
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleApplyStagger}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={14} /> Sequence All Layers Now
                                    </button>
                                </div>
                            </div>

                            {/* Current Layers List Preview */}
                            <div className="bg-[#181824] p-5 rounded-2xl border border-[#262635] flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-3">
                                        Layers ({elements.length})
                                    </h4>
                                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                        {elements.map((el, i) => (
                                            <div
                                                key={el.id}
                                                className="flex items-center justify-between p-2 rounded-lg bg-[#14141e] border border-[#222232] text-xs"
                                            >
                                                <span className="text-gray-200 font-medium truncate max-w-[140px]">
                                                    {i + 1}. {el.name || el.type}
                                                </span>
                                                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                    <span className="text-amber-400 font-mono">
                                                        {(el.enterDelay || 0).toFixed(2)}s
                                                    </span>
                                                    <span className="text-gray-500 truncate max-w-[80px]">
                                                        {animationLabel(el.enterAnimation || el.animation || 'none')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[#252535]">
                                    <button
                                        onClick={() => {
                                            elements.forEach((el) => updateElement(el.id, { enterDelay: 0, animationDelay: 0 }));
                                        }}
                                        className="w-full py-2 bg-[#20202c] hover:bg-[#282838] border border-[#2e2e40] text-gray-300 rounded-xl text-xs font-medium transition"
                                    >
                                        Reset All Delays to 0s
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Footer Bar */}
                <div className="px-6 py-3.5 border-t border-[#232330] bg-[#121217] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>Selected Animation:</span>
                        <span className="text-white font-bold bg-[#20202c] px-2.5 py-1 rounded-lg border border-[#2c2c3e]">
                            {animationLabel(currentPreset)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => {
                                handleSelectPreset('none');
                            }}
                            className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-[#232330] transition"
                        >
                            Remove Animation
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                            }}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition shadow-md shadow-red-600/20"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
