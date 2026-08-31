import React, { useState, useEffect } from 'react';
import { Toolbar, type ToolType } from '../Toolbar/Toolbar';
import { PropertiesPanel } from '../PropertiesPanel/PropertiesPanel';
import { DesignCanvas } from '../Canvas/DesignCanvas';
import { Layout, Layers, Undo2, Redo2, RefreshCcw, Play, Pause, Plus, Download, FileCode2, ChevronDown } from 'lucide-react';
import { useDesignStore, getArtboardPresets } from '../../store/designStore';
import { VariationsPanel } from '../Variations/VariationsPanel';
import { TemplatesPanel } from '../TemplatesPanel/TemplatesPanel';
import { AssetsPanel } from '../AssetsPanel/AssetsPanel';
import { LayersPanel } from '../LayersPanel/LayersPanel';
import { Timeline } from '../Timeline/Timeline';
import type { AppMode } from '../ModeSelect/ModeSelect';
import { getTemplateById } from '../../templates/emrTemplates';

type MainLayoutProps = {
    mode: AppMode;
    onChangeMode?: () => void;
};

export const MainLayout: React.FC<MainLayoutProps> = ({ mode, onChangeMode }) => {
    const {
        selectedId,
        undo,
        redo,
        past,
        future,
        removeElement,
        reset,
        loadTemplate,
        clearHistory,
        artboards,
        activeArtboardId,
        setActiveArtboard,
        addArtboard,
        addCampaignSizes,
        isPlaying,
        setIsPlaying,
    } = useDesignStore();

    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [showAddArtboard, setShowAddArtboard] = useState(false);
    const [showCampaign, setShowCampaign] = useState(false);
    const [campaignSelection, setCampaignSelection] = useState<Set<string>>(new Set());

    const campaignPresets = getArtboardPresets();
    const toggleCampaignSize = (label: string) =>
        setCampaignSelection((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    const generateCampaign = () => {
        const sizes = campaignPresets.filter((p) => campaignSelection.has(p.label));
        if (sizes.length > 0) addCampaignSizes(sizes);
        setShowCampaign(false);
        setCampaignSelection(new Set());
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            } else if (isCtrlOrCmd && e.key === 'y') {
                e.preventDefault();
                redo();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                const target = e.target as HTMLElement;
                if (!['INPUT', 'TEXTAREA'].includes(target.tagName) && selectedId) {
                    e.preventDefault();
                    removeElement(selectedId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, removeElement, selectedId]);

    useEffect(() => {
        if (mode === 'animated') {
            reset();
            clearHistory();
            return;
        }

        const emrTemplate = getTemplateById('emr-static-300x250');
        if (emrTemplate && 'elements' in emrTemplate) {
            reset();
            loadTemplate(emrTemplate.elements, emrTemplate.width, emrTemplate.height);
            clearHistory();
        }
    }, [mode, reset, loadTemplate, clearHistory]);

    const availablePresets = getArtboardPresets().filter(
        (p) => !artboards.some((a) => a.width === p.width && a.height === p.height),
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#1e1e26]">
            {/* Header */}
            <header className="h-14 bg-black border-b border-white/10 flex items-center px-4 gap-4 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <Layout size={18} />
                    </div>
                    <div>
                        <div className="font-bold text-white leading-none">Banner Studio</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Animated HTML5 builder</div>
                    </div>
                    <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${mode === 'emr'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                    >
                        {mode === 'emr' ? 'EMR' : 'ANIMATED'}
                    </span>
                    {onChangeMode && (
                        <button
                            onClick={onChangeMode}
                            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 border border-white/10 px-2 py-1 rounded-md transition"
                            title="Switch mode"
                        >
                            <RefreshCcw size={12} />
                            Switch
                        </button>
                    )}
                </div>

                {/* Artboards */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {artboards.map((ab) => (
                        <button
                            key={ab.id}
                            onClick={() => setActiveArtboard(ab.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${activeArtboardId === ab.id
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white/5 text-gray-300 border-white/10 hover:border-red-500/60'
                                }`}
                            title={`${ab.label} — ${ab.width}x${ab.height}`}
                        >
                            {ab.width}×{ab.height}
                        </button>
                    ))}

                    <button
                        onClick={() => setShowCampaign(true)}
                        className="px-2 py-1 rounded-md text-xs font-medium border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1"
                        title="Generate multiple banner sizes from one design"
                    >
                        <Layers size={12} /> Multi-size
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowAddArtboard(!showAddArtboard)}
                            className="px-2 py-1 rounded-md text-xs font-medium border border-white/10 text-gray-300 hover:border-red-500/60 hover:text-red-400 flex items-center gap-1"
                            title="Add size"
                        >
                            <Plus size={12} /> <ChevronDown size={10} />
                        </button>
                        {showAddArtboard && (
                            <div className="absolute top-full mt-1 left-0 bg-[#15151c] rounded-lg shadow-lg border border-[#2a2a35] py-1 z-[10000] min-w-[180px]">
                                {availablePresets.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-gray-400">All common sizes added</div>
                                )}
                                {availablePresets.map((p) => (
                                    <button
                                        key={p.label}
                                        onClick={() => {
                                            addArtboard(p.width, p.height, p.label);
                                            setShowAddArtboard(false);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-red-500/10 hover:text-red-400"
                                    >
                                        {p.label} · {p.width}×{p.height}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <div className="flex items-center gap-1">
                    <button
                        onClick={undo}
                        disabled={past.length === 0}
                        className="p-1.5 text-gray-300 hover:bg-white/10 hover:text-white rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={future.length === 0}
                        className="p-1.5 text-gray-300 hover:bg-white/10 hover:text-white rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo2 size={16} />
                    </button>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${isPlaying
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-red-600 text-white hover:bg-red-500/100'
                            }`}
                    >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        {isPlaying ? 'Stop' : 'Preview'}
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new Event('export-html'))}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition"
                    >
                        <FileCode2 size={14} /> Export HTML
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new Event('export-canvas'))}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition"
                    >
                        <Download size={14} /> PNG
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
                <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a21]">
                    <div className="flex-1 flex min-h-0">
                        {activeTool === 'layers' && <LayersPanel />}
                        {activeTool === 'assets' && <AssetsPanel />}
                        {activeTool === 'templates' && <TemplatesPanel />}
                        {activeTool === 'variations' && <VariationsPanel />}
                        <DesignCanvas />
                    </div>
                    <Timeline />
                </div>
                <PropertiesPanel />
            </div>

            {/* Multi-size campaign modal */}
            {showCampaign && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40" onClick={() => setShowCampaign(false)}>
                    <div className="bg-[#15151c] rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a35]">
                            <div>
                                <h3 className="font-bold text-gray-50">Multi-size campaign</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Generate all sizes from your current design</p>
                            </div>
                            <button onClick={() => setShowCampaign(false)} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
                        </div>
                        <div className="p-5 overflow-auto">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-gray-400 uppercase">Standard IAB sizes</span>
                                <button
                                    onClick={() => {
                                        const all = campaignSelection.size === campaignPresets.length
                                            ? new Set<string>()
                                            : new Set(campaignPresets.map((p) => p.label));
                                        setCampaignSelection(all);
                                    }}
                                    className="text-xs text-red-500 font-medium hover:underline"
                                >
                                    {campaignSelection.size === campaignPresets.length ? 'Clear all' : 'Select all'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {campaignPresets.map((p) => {
                                    const exists = artboards.some((a) => a.width === p.width && a.height === p.height);
                                    const checked = campaignSelection.has(p.label);
                                    return (
                                        <label
                                            key={p.label}
                                            className={`flex items-center gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer transition ${checked ? 'border-red-500 bg-red-500/10' : 'border-[#2a2a35] hover:border-red-500/40'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={exists}
                                                onChange={() => toggleCampaignSize(p.label)}
                                                className="rounded border-[#33333f] text-red-500 focus:ring-red-500"
                                            />
                                            <span className="flex-1">
                                                <span className="block text-sm font-medium text-gray-100">{p.label}</span>
                                                <span className="block text-[11px] text-gray-500">{p.width}×{p.height}</span>
                                            </span>
                                            {exists && <span className="text-[10px] text-emerald-600 font-medium">added</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2a2a35]">
                            <button onClick={() => setShowCampaign(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:bg-[#26262f] rounded-md">Cancel</button>
                            <button
                                onClick={generateCampaign}
                                disabled={campaignSelection.size === 0}
                                className="px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-40"
                            >
                                Generate {campaignSelection.size > 0 ? `${campaignSelection.size} size${campaignSelection.size > 1 ? 's' : ''}` : 'sizes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};