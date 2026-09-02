import React, { useRef } from 'react';
import { useDesignStore, type DesignElement } from '../../store/designStore';
import { EASINGS, applyStaggeredDelays } from '../../utils/keyframes';
import { getAnimationOptionGroups, getEntranceAnimationGroups, getExitAnimationGroups, isAnimistaLoop, animationLabel } from '../../utils/animations';
import {
    ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
    AlignLeft, AlignCenter, AlignRight,
    Bold, Italic, Underline, Link as LinkIcon, Type, List, Plus, Trash2
} from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
    const {
        elements,
        selectedId,
        selectedKeyframe,
        updateElement,
        updateKeyframe,
        removeKeyframe,
        reorderElement,
        canvasWidth,
        canvasHeight,
        canvasBackground,
        canvasBackgroundImage,
        setCanvasBackground,
        setCanvasBackgroundImage,
        artboards,
        activeArtboardId,
        setActiveArtboard,
        removeArtboard,
        addArtboard,
        totalDuration,
        loop,
        setLoop,
        addElementAnimation,
        updateElementAnimation,
        removeElementAnimation,
    } = useDesignStore();

    const isiTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [isiPaddingExpanded, setIsiPaddingExpanded] = React.useState(false);
    const [isiMarginExpanded, setIsiMarginExpanded] = React.useState(false);

    const selectedElement = elements.find(el => el.id === selectedId);

    const selectedKf =
        selectedElement && selectedKeyframe && selectedKeyframe.elementId === selectedElement.id
            ? selectedElement.anim?.keyframes.find(k => k.id === selectedKeyframe.keyframeId) || null
            : null;

    // This handleChange is for properties of a selected element
    const handleChange = (key: string, value: string | number | boolean | number[] | undefined) => {
        if (selectedElement) { // Ensure an element is selected before updating its properties
            updateElement(selectedElement.id, { [key]: value });
        }
    };

    const wrapSelection = (before: string, after: string) => {
        if (!isiTextareaRef.current || !selectedElement) return;
        
        const start = isiTextareaRef.current.selectionStart;
        const end = isiTextareaRef.current.selectionEnd;
        const text = selectedElement.isiText || '';
        
        const selectedText = text.substring(start, end);
        const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
        
        handleChange('isiText', newText);
        
        // Restore focus and selection
        setTimeout(() => {
            if (isiTextareaRef.current) {
                isiTextareaRef.current.focus();
                isiTextareaRef.current.setSelectionRange(start + before.length, end + before.length);
            }
        }, 0);
    };

    const insertPIBar = () => {
        const piBar = `<p style="font-size:10px;padding: 3px 10px 5px;background-color: #E8FFF9;font-weight: bold;margin-bottom:10px;"><a href="#" style="color:#000000;text-decoration:underline;">Prescribing Information</a></p>\n`;
        handleChange('isiText', piBar + (selectedElement?.isiText || ''));
    };

    const insertList = () => {
        const listText = `<ul>\n  <li>List item 1</li>\n  <li>List item 2</li>\n</ul>\n`;
        handleChange('isiText', (selectedElement?.isiText || '') + listText);
    };

    if (!selectedElement) {
        return (
            <div className="w-80 bg-[#15151c] border-l border-[#2a2a35] p-6 overflow-y-auto z-10">
                <h2 className="text-xl font-bold mb-6">Canvas Settings</h2>
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-medium text-gray-400 uppercase block mb-3">Background</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={canvasBackground}
                                        onChange={(e) => setCanvasBackground(e.target.value)}
                                        className="h-10 w-10 rounded border border-[#2a2a35] cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-400">{canvasBackground.toUpperCase()}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Image URL</label>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    value={canvasBackgroundImage || ''}
                                    onChange={(e) => setCanvasBackgroundImage(e.target.value || undefined)}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#232330] pt-6">
                        <label className="text-xs font-medium text-gray-400 uppercase block mb-3">Canvas Size</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Width</label>
                                <div className="px-3 py-2 bg-[#1a1a21] rounded text-sm text-gray-400 border border-[#232330] font-medium">
                                    {canvasWidth}px
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Height</label>
                                <div className="px-3 py-2 bg-[#1a1a21] rounded text-sm text-gray-400 border border-[#232330] font-medium">
                                    {canvasHeight}px
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#232330] pt-6">
                        <label className="text-xs font-medium text-gray-400 uppercase block mb-3">Artboards (Sizes)</label>
                        <div className="space-y-2">
                            {artboards.map((ab) => (
                                <div
                                    key={ab.id}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${activeArtboardId === ab.id ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-[#232330] bg-[#1a1a21] text-gray-400'
                                        }`}
                                >
                                    <button className="flex-1 text-left" onClick={() => setActiveArtboard(ab.id)}>
                                        <span className="font-medium">{ab.label}</span>
                                        <span className="text-xs text-gray-400 ml-2">{ab.width}×{ab.height}</span>
                                    </button>
                                    <button
                                        onClick={() => removeArtboard(ab.id)}
                                        disabled={artboards.length <= 1}
                                        className="text-gray-400 hover:text-red-500 disabled:opacity-30 px-1"
                                        title="Remove size"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 pt-1">
                                <select
                                    className="flex-1 border border-[#2a2a35] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    onChange={(e) => {
                                        const [w, h] = e.target.value.split('x').map(Number);
                                        if (w && h) addArtboard(w, h);
                                        e.target.value = '';
                                    }}
                                    value=""
                                >
                                    <option value="" disabled>Add a common size…</option>
                                    {[
                                        { label: 'Medium Rectangle', w: 300, h: 250 },
                                        { label: 'Leaderboard', w: 728, h: 90 },
                                        { label: 'Wide Skyscraper', w: 160, h: 600 },
                                        { label: 'Half Page', w: 300, h: 600 },
                                        { label: 'Billboard', w: 970, h: 250 },
                                        { label: 'Large Rectangle', w: 336, h: 280 },
                                        { label: 'Square', w: 250, h: 250 },
                                        { label: 'Mobile Leaderboard', w: 320, h: 50 },
                                        { label: 'Mobile Banner', w: 320, h: 100 },
                                        { label: 'Skyscraper', w: 120, h: 600 },
                                    ].map((s) => (
                                        <option key={`${s.w}x${s.h}`} value={`${s.w}x${s.h}`}>
                                            {s.label} · {s.w}×{s.h}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#232330] pt-6">
                        <label className="text-xs font-medium text-gray-400 uppercase block mb-3">Animation Timeline</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Duration (s)</label>
                                <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    value={totalDuration}
                                    onChange={(e) => { const { setTotalDuration } = useDesignStore.getState(); setTotalDuration(parseFloat(e.target.value) || 1); }}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                />
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 text-xs text-gray-400">
                                    <input
                                        type="checkbox"
                                        checked={loop}
                                        onChange={(e) => setLoop(e.target.checked)}
                                        className="rounded border-[#33333f] text-red-500 focus:ring-red-500"
                                    />
                                    Loop
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



return (
    <div className="w-80 bg-[#15151c] border-l border-[#2a2a35] flex flex-col overflow-y-auto z-10">
        <div className="p-4 border-b border-[#232330]">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-100">Properties</h2>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                    {selectedElement.type}
                </span>
            </div>
            <input
                type="text"
                value={selectedElement.name || ''}
                placeholder={selectedElement.type}
                onChange={(e) => handleChange('name', e.target.value || undefined)}
                className="mt-2 w-full border border-[#2a2a35] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
            />
        </div>

        <div className="p-4 space-y-6">
            {/* Layer Management */}
            <div className="space-y-3">
                <label className="text-xs font-medium text-gray-400 uppercase">Layering</label>
                    <div className="flex gap-2">
                        <button onClick={() => reorderElement(selectedElement.id, 'up')} className="p-2 hover:bg-[#26262f] rounded" title="Bring Forward"><ArrowUp size={16} /></button>
                        <button onClick={() => reorderElement(selectedElement.id, 'down')} className="p-2 hover:bg-[#26262f] rounded" title="Send Backward"><ArrowDown size={16} /></button>
                        <button onClick={() => reorderElement(selectedElement.id, 'top')} className="p-2 hover:bg-[#26262f] rounded" title="Bring to Front"><ChevronsUp size={16} /></button>
                        <button onClick={() => reorderElement(selectedElement.id, 'bottom')} className="p-2 hover:bg-[#26262f] rounded" title="Send to Back"><ChevronsDown size={16} /></button>
                    </div>
                </div>

                {/* Keyframe Editor */}
                <div className="space-y-3 border-t border-[#232330] pt-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400 uppercase">Keyframe</label>
                        {selectedKf && (
                            <button
                                onClick={() => removeKeyframe(selectedElement.id, selectedKf.id)}
                                className="text-[10px] text-red-500 hover:text-red-600 font-medium"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    {selectedKf ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Time (s)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={Math.round(selectedKf.time * 100) / 100}
                                    onChange={(e) => updateKeyframe(selectedElement.id, selectedKf.id, { time: Number(e.target.value) })}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">X</label>
                                    <input
                                        type="number"
                                        value={selectedKf.x ?? ''}
                                        onChange={(e) => updateKeyframe(selectedElement.id, selectedKf.id, { x: e.target.value === '' ? undefined : Number(e.target.value) })}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Y</label>
                                    <input
                                        type="number"
                                        value={selectedKf.y ?? ''}
                                        onChange={(e) => updateKeyframe(selectedElement.id, selectedKf.id, { y: e.target.value === '' ? undefined : Number(e.target.value) })}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-gray-400 block">Opacity</label>
                                    <span className="text-xs text-gray-400">{selectedKf.opacity ?? 100}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={selectedKf.opacity ?? 100}
                                    onChange={(e) => updateKeyframe(selectedElement.id, selectedKf.id, { opacity: Number(e.target.value) })}
                                    className="w-full h-1.5 bg-[#26262f] rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Rotation</label>
                                    <input
                                        type="number"
                                        value={selectedKf.rotation ?? 0}
                                        onChange={(e) => updateKeyframe(selectedElement.id, selectedKf.id, { rotation: Number(e.target.value) })}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Scale X</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={selectedKf.scaleX ?? 1}
                                        onChange={(e) => updateKeyframe(selectedElement.id, selectedKf.id, { scaleX: Number(e.target.value) })}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Scale Y</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={selectedKf.scaleY ?? 1}
                                        onChange={(e) => updateKeyframe(selectedElement.id, selectedKf.id, { scaleY: Number(e.target.value) })}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Easing</label>
                                <select
                                    value={selectedKf.easing}
                                    onChange={(e) => updateKeyframe(selectedElement.id, selectedKf.id, { easing: e.target.value })}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                >
                                    {EASINGS.map((e) => (
                                        <option key={e.id} value={e.id}>{e.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">
                            {selectedElement.anim?.keyframes?.length
                                ? 'Select a diamond on the timeline to edit its values.'
                                : 'No keyframes yet. Double-click this layer\'s row on the timeline to add one.'}
                        </p>
                    )}
                </div>

                {/* Position & Size */}
                <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-400 uppercase">Position & Size</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">X</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.x)}
                                onChange={(e) => handleChange('x', Number(e.target.value))}
                                className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Y</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.y)}
                                onChange={(e) => handleChange('y', Number(e.target.value))}
                                className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Width</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.width || 0)}
                                onChange={(e) => handleChange('width', Number(e.target.value))}
                                className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Height</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.height || 0)}
                                onChange={(e) => handleChange('height', Number(e.target.value))}
                                className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Rotation (°)</label>
                            <input
                                type="number"
                                value={Math.round(selectedElement.rotation || 0)}
                                onChange={(e) => handleChange('rotation', Number(e.target.value))}
                                className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                            />
                        </div>
                    </div>
                </div>

                {/* Appearance */}
                {(selectedElement.type === 'rect' || selectedElement.type === 'text' || selectedElement.type === 'circle') && (
                    <div className="space-y-4 border-t border-[#232330] pt-4">
                        <label className="text-xs font-medium text-gray-400 uppercase">Appearance</label>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Fill</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={selectedElement.fill || '#000000'}
                                            onChange={(e) => handleChange('fill', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                        />
                                        <span className="text-xs text-gray-400">{selectedElement.fill}</span>
                                    </div>
                                </div>
                                {selectedElement.type === 'rect' && (
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Radius</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={selectedElement.cornerRadius || 0}
                                            onChange={(e) => handleChange('cornerRadius', Number(e.target.value))}
                                            className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-gray-400 block">Opacity</label>
                                    <span className="text-xs text-gray-400">{selectedElement.opacity ?? 100}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={selectedElement.opacity ?? 100}
                                    onChange={(e) => handleChange('opacity', Number(e.target.value))}
                                    className="w-full h-1.5 bg-[#26262f] rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Stroke Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={selectedElement.stroke || '#000000'}
                                            onChange={(e) => handleChange('stroke', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer border border-[#2a2a35]"
                                        />
                                        <span className="text-xs text-gray-400">{selectedElement.stroke || 'None'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Stroke Width</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={selectedElement.strokeWidth || 0}
                                        onChange={(e) => handleChange('strokeWidth', Number(e.target.value))}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Text Specific */}
                {selectedElement.type === 'text' && (
                    <div className="space-y-4 border-t border-[#232330] pt-4">
                        <label className="text-xs font-medium text-gray-400 uppercase">Typography</label>
                        <div className="space-y-3">
                            <textarea
                                value={selectedElement.text || ''}
                                onChange={(e) => handleChange('text', e.target.value)}
                                className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100 min-h-[60px]"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Font Size</label>
                                    <input
                                        type="number"
                                        value={selectedElement.fontSize || 20}
                                        onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={selectedElement.fill || '#000000'}
                                            onChange={(e) => handleChange('fill', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                        />
                                        <span className="text-xs text-gray-400">{selectedElement.fill}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-gray-400 block">Alignment</label>
                                <div className="flex bg-[#1e1e26] p-1 rounded-md w-fit">
                                    <button
                                        onClick={() => handleChange('textAlign', 'left')}
                                        className={`p-1.5 rounded ${selectedElement.textAlign === 'left' || !selectedElement.textAlign ? 'bg-[#15151c] shadow-sm text-red-500' : 'text-gray-400'}`}
                                    >
                                        <AlignLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleChange('textAlign', 'center')}
                                        className={`p-1.5 rounded ${selectedElement.textAlign === 'center' ? 'bg-[#15151c] shadow-sm text-red-500' : 'text-gray-400'}`}
                                    >
                                        <AlignCenter size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleChange('textAlign', 'right')}
                                        className={`p-1.5 rounded ${selectedElement.textAlign === 'right' ? 'bg-[#15151c] shadow-sm text-red-500' : 'text-gray-400'}`}
                                    >
                                        <AlignRight size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-gray-400 block">Style</label>
                                <div className="flex bg-[#1e1e26] p-1 rounded-md w-fit gap-1">
                                    <button
                                        onClick={() => handleChange('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold')}
                                        className={`p-1.5 rounded ${selectedElement.fontWeight === 'bold' ? 'bg-[#15151c] shadow-sm text-red-500' : 'text-gray-400'}`}
                                        title="Bold"
                                    >
                                        <Bold size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleChange('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic')}
                                        className={`p-1.5 rounded ${selectedElement.fontStyle === 'italic' ? 'bg-[#15151c] shadow-sm text-red-500' : 'text-gray-400'}`}
                                        title="Italic"
                                    >
                                        <Italic size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleChange('textDecoration', selectedElement.textDecoration === 'underline' ? 'none' : 'underline')}
                                        className={`p-1.5 rounded ${selectedElement.textDecoration === 'underline' ? 'bg-[#15151c] shadow-sm text-red-500' : 'text-gray-400'}`}
                                        title="Underline"
                                    >
                                        <Underline size={16} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Font Family</label>
                                <select
                                    value={selectedElement.fontFamily || 'Arial'}
                                    onChange={(e) => handleChange('fontFamily', e.target.value)}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Courier New">Courier New</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Impact">Impact</option>
                                    <option value="Comic Sans MS">Comic Sans MS</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Letter Spacing</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={selectedElement.letterSpacing || 0}
                                        onChange={(e) => handleChange('letterSpacing', Number(e.target.value))}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Line Height</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={selectedElement.lineHeight || 1.2}
                                        onChange={(e) => handleChange('lineHeight', Number(e.target.value))}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Animation Controls */}
                <div className="space-y-3 border-t border-[#232330] pt-4">
                    <label className="text-xs font-medium text-gray-400 uppercase">Quick Animation</label>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Preset</label>
                            <select
                                value={selectedElement.animation || 'none'}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    updateElement(selectedElement.id, {
                                        animation: value === 'none' ? undefined : value as DesignElement['animation'],
                                        anim: undefined,
                                        animationLoop: isAnimistaLoop(value),
                                    });
                                }}
                                className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                            >
                                <option value="none">None (use keyframes)</option>
                                {getAnimationOptionGroups().map((group) => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.options.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Entrance</label>
                                <select
                                    value={selectedElement.enterAnimation || 'none'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        updateElement(selectedElement.id, {
                                            enterAnimation: value === 'none' ? undefined : value,
                                        });
                                    }}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                >
                                    <option value="none">None</option>
                                    {getEntranceAnimationGroups().map((group) => (
                                        <optgroup key={group.label} label={group.label}>
                                            {group.options.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Exit</label>
                                <select
                                    value={selectedElement.exitAnimation || 'none'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        updateElement(selectedElement.id, {
                                            exitAnimation: value === 'none' ? undefined : value,
                                        });
                                    }}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                >
                                    <option value="none">None</option>
                                    {getExitAnimationGroups().map((group) => (
                                        <optgroup key={group.label} label={group.label}>
                                            {group.options.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Enter Delay (s)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={selectedElement.enterDelay || 0}
                                    onChange={(e) => handleChange('enterDelay', Number(e.target.value))}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Exit Delay (s)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={selectedElement.exitDelay || 0}
                                    onChange={(e) => handleChange('exitDelay', Number(e.target.value))}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Duration (s)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={selectedElement.animationDuration || 1}
                                    onChange={(e) => handleChange('animationDuration', Number(e.target.value))}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Delay (s)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={selectedElement.animationDelay || 0}
                                    onChange={(e) => handleChange('animationDelay', Number(e.target.value))}
                                    className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="animationLoop"
                                checked={selectedElement.animationLoop || false}
                                onChange={(e) => handleChange('animationLoop', e.target.checked)}
                                className="rounded border-[#33333f] text-red-500 focus:ring-red-500"
                            />
                            <label htmlFor="animationLoop" className="text-xs text-gray-200">
                                Loop Animation
                            </label>
                        </div>

                        <div className="border-t border-[#232330] pt-3">
                            <label className="text-xs font-medium text-gray-400 uppercase mb-2 block">Sequence (Stagger)</label>
                            <p className="text-[11px] text-gray-400 mb-2">
                                Apply staggered delays to all layers so they animate one after another (bottom to top).
                            </p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Gap (s)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={0.2}
                                        onChange={() => {}}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        id="staggerGap"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            const gap = parseFloat((document.getElementById('staggerGap') as HTMLInputElement)?.value || '0.2');
                                            const updates = applyStaggeredDelays(elements, gap, true);
                                            updates.forEach(u => updateElement(u.id!, { enterDelay: u.enterDelay }));
                                        }}
                                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded px-3 py-1.5 text-xs font-medium transition"
                                    >
                                        Sequence Layers
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        const gap = parseFloat((document.getElementById('staggerGap') as HTMLInputElement)?.value || '0.2');
                                        const updates = applyStaggeredDelays(elements, gap, false);
                                        updates.forEach(u => updateElement(u.id!, { animationDelay: u.animationDelay }));
                                    }}
                                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-[#2a2a35] rounded px-3 py-1.5 text-xs font-medium transition"
                                >
                                    Sequence (Main Anim)
                                </button>
                                <button
                                    onClick={() => {
                                        elements.forEach(el => updateElement(el.id, { enterDelay: 0, animationDelay: 0 }));
                                    }}
                                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-[#2a2a35] rounded px-3 py-1.5 text-xs font-medium transition"
                                >
                                    Clear All Delays
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timed Animation Blocks (multiple animations per element, each in its own timeframe) */}
                <div className="space-y-3 border-t border-[#232330] pt-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400 uppercase">
                            Timed Animations
                        </label>
                        <button
                            onClick={() =>
                                addElementAnimation(selectedElement.id, {
                                    id: `anim-${Date.now()}`,
                                    preset: 'fadeIn',
                                    start: 0,
                                    duration: 1,
                                })
                            }
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 font-medium"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-400">
                        Add more animations for this element — each one plays inside its own timeframe
                        (e.g. fade in at 0s, fade out at 5s).
                    </p>
                    <div className="space-y-3">
                        {(selectedElement.animations || []).map((block) => (
                            <div key={block.id} className="border border-[#2a2a35] rounded-lg p-2.5 space-y-2 bg-[#1a1a21]/60">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-200 truncate">
                                        {animationLabel(block.preset)}
                                    </span>
                                    <button
                                        onClick={() => removeElementAnimation(selectedElement.id, block.id)}
                                        className="text-gray-400 hover:text-red-500"
                                        title="Remove animation"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 mb-1 block">Preset</label>
                                    <select
                                        value={block.preset}
                                        onChange={(e) =>
                                            updateElementAnimation(selectedElement.id, block.id, {
                                                preset: e.target.value,
                                            })
                                        }
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    >
                                        {getAnimationOptionGroups().map((group) => (
                                            <optgroup key={group.label} label={group.label}>
                                                {group.options.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Start (s)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={block.start}
                                            onChange={(e) =>
                                                updateElementAnimation(selectedElement.id, block.id, {
                                                    start: Number(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Duration (s)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={block.duration}
                                            onChange={(e) =>
                                                updateElementAnimation(selectedElement.id, block.id, {
                                                    duration: Number(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Easing</label>
                                        <select
                                            value={block.ease || 'power1.inOut'}
                                            onChange={(e) =>
                                                updateElementAnimation(selectedElement.id, block.id, {
                                                    ease: e.target.value,
                                                })
                                            }
                                            className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        >
                                            {EASINGS.map((e) => (
                                                <option key={e.id} value={e.id}>
                                                    {e.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-1.5 text-xs text-gray-400 pb-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={block.loop || false}
                                                onChange={(e) =>
                                                    updateElementAnimation(selectedElement.id, block.id, {
                                                        loop: e.target.checked,
                                                    })
                                                }
                                                className="rounded border-gray-400 text-red-500 focus:ring-red-500"
                                            />
                                            Loop
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(selectedElement.animations || []).length === 0 && (
                            <div className="text-[11px] text-gray-400 border border-dashed border-[#2a2a35] rounded-lg p-3 text-center">
                                No timed animations yet. Click <span className="text-red-500 font-medium">+ Add</span> to
                                run another animation on this element.
                            </div>
                        )}
                    </div>
                </div>

                {/* Shadow */}
                {(selectedElement.type === 'rect' || selectedElement.type === 'circle' || selectedElement.type === 'text') && (
                    <div className="space-y-4 border-t border-[#232330] pt-4 pb-2">
                        <label className="text-xs font-medium text-gray-400 uppercase">Shadow</label>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Blur</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={selectedElement.shadowBlur || 0}
                                        onChange={(e) => handleChange('shadowBlur', Number(e.target.value))}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Color</label>
                                    <input
                                        type="color"
                                        value={selectedElement.shadowColor || '#000000'}
                                        onChange={(e) => handleChange('shadowColor', e.target.value)}
                                        className="w-full h-8 rounded cursor-pointer border-none bg-transparent"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Offset X</label>
                                    <input
                                        type="number"
                                        value={selectedElement.shadowOffsetX || 0}
                                        onChange={(e) => handleChange('shadowOffsetX', Number(e.target.value))}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Offset Y</label>
                                    <input
                                        type="number"
                                        value={selectedElement.shadowOffsetY || 0}
                                        onChange={(e) => handleChange('shadowOffsetY', Number(e.target.value))}
                                        className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hover Effects */}
                <div className="space-y-3 border-t border-[#232330] pt-4">
                    <label className="text-xs font-medium text-gray-400 uppercase">Hover Effects</label>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Effect Type</label>
                            <select
                                value={selectedElement.hoverAnimation || 'none'}
                                onChange={(e) => handleChange('hoverAnimation', e.target.value)}
                                className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                            >
                                <option value="none">None</option>
                                <option value="colorChange">Color Transition</option>
                                <option value="glow">Glow Effect</option>
                                <option value="shadowPop">Shadow Pop</option>
                                {selectedElement.type === 'text' && (
                                    <option value="letterSpacing">Letter Spacing</option>
                                )}
                                <option value="scale">Scale Up</option>
                            </select>
                        </div>

                        {(selectedElement.hoverAnimation === 'colorChange' || selectedElement.hoverAnimation === 'glow') && (
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Hover Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={selectedElement.hoverColor || '#3b82f6'}
                                        onChange={(e) => handleChange('hoverColor', e.target.value)}
                                        className="h-8 w-8 rounded border border-[#2a2a35] cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={selectedElement.hoverColor || '#3b82f6'}
                                        onChange={(e) => handleChange('hoverColor', e.target.value)}
                                        className="flex-1 border border-[#2a2a35] rounded px-2 py-1 text-sm focus:border-red-500 focus:outline-none uppercase bg-[#1a1a21] text-gray-100"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* HTML Content Editor */}
                {selectedElement.type === 'html' && (
                    <div className="space-y-4 border-t border-[#232330] pt-4 pb-6">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">HTML Content</label>
                        </div>
                        
                        <div className="space-y-2">
                            <div>
                                <label className="text-xs text-gray-400 font-medium mb-1.5 block">HTML Code</label>
                                <textarea
                                    value={selectedElement.htmlContent || ''}
                                    onChange={(e) => handleChange('htmlContent', e.target.value)}
                                    rows={10}
                                    className="w-full border border-[#2a2a35] rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/30 focus:outline-none resize-y bg-[#1a1a21] transition-all font-mono"
                                    placeholder="<div>Your HTML here...</div>"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ISI Scroll Controls */}
                {selectedElement.type === 'isiScroll' && (
                    <div className="space-y-4 border-t border-[#232330] pt-4 pb-6">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ISI Pro Suite</label>
                            <span className="bg-green-50 text-green-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">EMR Standard</span>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Content */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5 ">
                                    <label className="text-xs text-gray-400 font-medium">ISI Text (HTML Supported)</label>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => wrapSelection('<b>', '</b>')}
                                            className="p-1 hover:bg-[#26262f] rounded text-gray-400 transition-colors" 
                                            title="Bold"
                                        >
                                            <Bold size={14} />
                                        </button>
                                        <button 
                                            onClick={() => wrapSelection('<i>', '</i>')}
                                            className="p-1 hover:bg-[#26262f] rounded text-gray-400 transition-colors" 
                                            title="Italic"
                                        >
                                            <Italic size={14} />
                                        </button>
                                        <button 
                                            onClick={() => wrapSelection('<u>', '</u>')}
                                            className="p-1 hover:bg-[#26262f] rounded text-gray-400 transition-colors" 
                                            title="Underline"
                                        >
                                            <Underline size={14} />
                                        </button>
                                        <button 
                                            onClick={() => wrapSelection('<a href="#" style="color:#0000ff; text-decoration:underline;">', '</a>')}
                                            className="p-1 hover:bg-[#26262f] rounded text-gray-400 transition-colors" 
                                            title="Link"
                                        >
                                            <LinkIcon size={14} />
                                        </button>
                                        <button onClick={insertList} className="p-1 hover:bg-[#26262f] rounded text-gray-400 transition-colors" title="Add List">
                                            <List size={14} />
                                        </button>
                                        <button 
                                            onClick={() => wrapSelection('<span style="color:#0000ff;">', '</span>')}
                                            className="p-1 hover:bg-[#26262f] rounded text-gray-400 transition-colors" 
                                            title="Blue Text"
                                        >
                                            <Type size={14} className="text-red-500" />
                                        </button>
                                        <button 
                                            onClick={insertPIBar}
                                            className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] rounded font-bold hover:bg-green-100 transition-colors"
                                            title="Insert PI Header"
                                        >
                                            PI BAR
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    ref={isiTextareaRef}
                                    value={selectedElement.isiText || ''}
                                    onChange={(e) => handleChange('isiText', e.target.value)}
                                    rows={8}
                                    className="w-full border border-[#2a2a35] rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/30 focus:outline-none resize-none bg-[#1a1a21] transition-all font-mono"
                                    placeholder="Enter ISI text content..."
                                />
                            </div>

                            {/* Traditional Header Bar ("Prescribing Information" strip) */}
                            <div className="space-y-2 border-t border-[#232330] pt-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Header Bar</label>
                                    <span className="bg-emerald-50 text-emerald-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">PI Link Strip</span>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 mb-1 block">Header Text</label>
                                    <input
                                        type="text"
                                        value={selectedElement.isiHeaderText || ''}
                                        onChange={(e) => handleChange('isiHeaderText', e.target.value || undefined)}
                                        placeholder="Prescribing Information"
                                        className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 mb-1 block">Link URL</label>
                                    <input
                                        type="text"
                                        value={selectedElement.isiHeaderLink || ''}
                                        onChange={(e) => handleChange('isiHeaderLink', e.target.value || undefined)}
                                        placeholder="https://.../prescribing_information.pdf"
                                        className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Bar BG</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={selectedElement.isiHeaderBackground || '#E8FFF9'}
                                                onChange={(e) => handleChange('isiHeaderBackground', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border border-[#232330] shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Text</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={selectedElement.isiHeaderColor || '#000000'}
                                                onChange={(e) => handleChange('isiHeaderColor', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border border-[#232330] shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Height</label>
                                        <input
                                            type="number"
                                            value={selectedElement.isiHeaderHeight || 20}
                                            onChange={(e) => handleChange('isiHeaderHeight', Number(e.target.value))}
                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Branding Section */}
                            <div className="space-y-2 border-t border-[#232330] pt-3">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Logo / Branding</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Logo Link URL</label>
                                        <input
                                            type="text"
                                            value={selectedElement.isiLogoLink || ''}
                                            onChange={(e) => handleChange('isiLogoLink', e.target.value)}
                                            placeholder="https://logo-click-through.com"
                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#15151c] text-gray-100 mb-2"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={selectedElement.isiLogoSrc || ''}
                                            onChange={(e) => handleChange('isiLogoSrc', e.target.value)}
                                            placeholder="https://... or upload below"
                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#15151c] text-gray-100"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const result = ev.target?.result;
                                                        if (typeof result === 'string') {
                                                            handleChange('isiLogoSrc', result);
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <div className="text-center px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium rounded border border-red-500/30 transition-colors">
                                                Upload Logo
                                            </div>
                                        </label>
                                        {selectedElement.isiLogoSrc && (
                                            <button
                                                type="button"
                                                onClick={() => handleChange('isiLogoSrc', '')}
                                                title="Remove logo"
                                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded border border-red-500/30 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    {selectedElement.isiLogoSrc && (
                                        <div className="bg-[#1a1a21] rounded p-2 border border-[#232330] flex items-center justify-center">
                                            <img
                                                src={selectedElement.isiLogoSrc}
                                                alt="Logo preview"
                                                className="max-h-12 object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-gray-400 mb-1 block">Logo Width</label>
                                            <input
                                                type="number"
                                                title="Logo width in pixels"
                                                value={selectedElement.isiLogoWidth || 187}
                                                onChange={(e) => handleChange('isiLogoWidth', Number(e.target.value))}
                                                className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-400 mb-1 block">Position</label>
                                            <select
                                                title="Logo position"
                                                value={selectedElement.isiLogoPosition || 'bottom'}
                                                onChange={(e) => handleChange('isiLogoPosition', e.target.value)}
                                                className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                            >
                                                <option value="top">Top</option>
                                                <option value="bottom">Bottom</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Styling Section */}
                            <div className="space-y-2 border-t border-[#232330] pt-3">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Styling & Scroll</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">BG Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={selectedElement.isiBackgroundColor || '#ffffff'}
                                                onChange={(e) => handleChange('isiBackgroundColor', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border border-[#232330] shadow-sm"
                                            />
                                            <span className="text-[10px] text-gray-400 font-mono">{(selectedElement.isiBackgroundColor || '#ffffff').toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Scroll Speed</label>
                                        <input
                                            type="number"
                                            value={selectedElement.isiScrollSpeed || 30}
                                            onChange={(e) => handleChange('isiScrollSpeed', Number(e.target.value))}
                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <div className="col-span-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] text-gray-400 mb-1 block">Padding</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsiPaddingExpanded(!isiPaddingExpanded)}
                                                    className="text-[10px] text-gray-400 hover:text-gray-200 flex items-center gap-1"
                                                    title={isiPaddingExpanded ? 'Collapse' : 'Expand'}
                                                >
                                                    {isiPaddingExpanded ? (
                                                        <ChevronsUp size={12} />
                                                    ) : (
                                                        <ChevronsDown size={12} />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-gray-400 mb-1 block">All Sides</label>
                                                    <input
                                                        type="number"
                                                        value={selectedElement.isiPadding ?? 10}
                                                        onChange={(e) => handleChange('isiPadding', Number(e.target.value))}
                                                        className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                    />
                                                </div>
                                            </div>
                                            {isiPaddingExpanded && (
                                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#232330]">
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 mb-1 block">Top</label>
                                                        <input
                                                            type="number"
                                                            value={selectedElement.isiPaddingTop ?? ''}
                                                            onChange={(e) => handleChange('isiPaddingTop', e.target.value === '' ? undefined : Number(e.target.value))}
                                                            placeholder="Auto"
                                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 mb-1 block">Right</label>
                                                        <input
                                                            type="number"
                                                            value={selectedElement.isiPaddingRight ?? ''}
                                                            onChange={(e) => handleChange('isiPaddingRight', e.target.value === '' ? undefined : Number(e.target.value))}
                                                            placeholder="Auto"
                                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 mb-1 block">Bottom</label>
                                                        <input
                                                            type="number"
                                                            value={selectedElement.isiPaddingBottom ?? ''}
                                                            onChange={(e) => handleChange('isiPaddingBottom', e.target.value === '' ? undefined : Number(e.target.value))}
                                                            placeholder="Auto"
                                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 mb-1 block">Left</label>
                                                        <input
                                                            type="number"
                                                            value={selectedElement.isiPaddingLeft ?? ''}
                                                            onChange={(e) => handleChange('isiPaddingLeft', e.target.value === '' ? undefined : Number(e.target.value))}
                                                            placeholder="Auto"
                                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Margin Section */}
                                    <div className="col-span-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] text-gray-400 mb-1 block">Margin</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsiMarginExpanded(!isiMarginExpanded)}
                                                    className="text-[10px] text-gray-400 hover:text-gray-200 flex items-center gap-1"
                                                    title={isiMarginExpanded ? 'Collapse' : 'Expand'}
                                                >
                                                    {isiMarginExpanded ? (
                                                        <ChevronsUp size={12} />
                                                    ) : (
                                                        <ChevronsDown size={12} />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-gray-400 mb-1 block">All Sides</label>
                                                    <input
                                                        type="number"
                                                        value={selectedElement.isiMargin ?? 0}
                                                        onChange={(e) => handleChange('isiMargin', Number(e.target.value))}
                                                        className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                    />
                                                </div>
                                            </div>
                                            {isiMarginExpanded && (
                                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#232330]">
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 mb-1 block">Top</label>
                                                        <input
                                                            type="number"
                                                            value={selectedElement.isiMarginTop ?? ''}
                                                            onChange={(e) => handleChange('isiMarginTop', e.target.value === '' ? undefined : Number(e.target.value))}
                                                            placeholder="Auto"
                                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 mb-1 block">Right</label>
                                                        <input
                                                            type="number"
                                                            value={selectedElement.isiMarginRight ?? ''}
                                                            onChange={(e) => handleChange('isiMarginRight', e.target.value === '' ? undefined : Number(e.target.value))}
                                                            placeholder="Auto"
                                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 mb-1 block">Bottom</label>
                                                        <input
                                                            type="number"
                                                            value={selectedElement.isiMarginBottom ?? ''}
                                                            onChange={(e) => handleChange('isiMarginBottom', e.target.value === '' ? undefined : Number(e.target.value))}
                                                            placeholder="Auto"
                                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 mb-1 block">Left</label>
                                                        <input
                                                            type="number"
                                                            value={selectedElement.isiMarginLeft ?? ''}
                                                            onChange={(e) => handleChange('isiMarginLeft', e.target.value === '' ? undefined : Number(e.target.value))}
                                                            placeholder="Auto"
                                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Track Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={selectedElement.isiScrollbarColor || '#006937'}
                                                onChange={(e) => handleChange('isiScrollbarColor', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border border-[#232330] shadow-sm"
                                            />
                                            <span className="text-[10px] text-gray-400 font-mono">{(selectedElement.isiScrollbarColor || '#006937').toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Indicator</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={selectedElement.isiScrollbarTrackColor || '#f2f2f2'}
                                                onChange={(e) => handleChange('isiScrollbarTrackColor', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border border-[#232330] shadow-sm"
                                            />
                                            <span className="text-[10px] text-gray-400 font-mono">{(selectedElement.isiScrollbarTrackColor || '#f2f2f2').toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-[#232330] pt-3 mt-3">
                                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Scrollbar Size &amp; Spacing</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-gray-400 mb-1 block">Height (%)</label>
                                            <input
                                                type="number"
                                                title="Scrollbar height as a percent of the content body"
                                                min={1}
                                                max={100}
                                                value={selectedElement.isiScrollbarHeight ?? 66}
                                                onChange={(e) => handleChange('isiScrollbarHeight', Number(e.target.value))}
                                                className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-400 mb-1 block">Width (px)</label>
                                            <input
                                                type="number"
                                                title="Scrollbar width in pixels"
                                                value={selectedElement.isiScrollbarWidth ?? 8}
                                                onChange={(e) => handleChange('isiScrollbarWidth', Number(e.target.value))}
                                                className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-400 mb-1 block">Padding</label>
                                            <input
                                                type="number"
                                                title="Padding inside the scrollbar track"
                                                value={selectedElement.isiScrollbarPadding ?? 0}
                                                onChange={(e) => handleChange('isiScrollbarPadding', Number(e.target.value))}
                                                className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-400 mb-1 block">Margin Top</label>
                                            <input
                                                type="number"
                                                title="Offset the scrollbar from the top (defaults to 5px)"
                                                value={selectedElement.isiScrollbarMarginTop ?? 5}
                                                onChange={(e) => handleChange('isiScrollbarMarginTop', Number(e.target.value))}
                                                className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-400 mb-1 block">Margin Right</label>
                                            <input
                                                type="number"
                                                title="Offset the scrollbar from the right edge"
                                                value={selectedElement.isiScrollbarMarginRight ?? 3}
                                                onChange={(e) => handleChange('isiScrollbarMarginRight', Number(e.target.value))}
                                                className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Typography Section */}
                            <div className="space-y-2 border-t border-[#232330] pt-3">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">ISI Typography</label>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Font Size</label>
                                        <input
                                            type="number"
                                            min="6"
                                            title="ISI font size"
                                            value={selectedElement.fontSize || 12}
                                            onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Font Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                title="ISI font color"
                                                value={selectedElement.fill || '#000000'}
                                                onChange={(e) => handleChange('fill', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border border-[#232330] shadow-sm"
                                            />
                                            <span className="text-[10px] text-gray-400 font-mono">{(selectedElement.fill || '#000000').toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <label className="text-[11px] text-gray-400 mb-1 block">Font Style</label>
                                    <div className="flex bg-[#1e1e26] p-1 rounded-md w-fit gap-1">
                                        <button
                                            onClick={() => handleChange('isiFontWeight', selectedElement.isiFontWeight === 'bold' ? 'normal' : 'bold')}
                                            className={`p-1.5 rounded ${selectedElement.isiFontWeight === 'bold' ? 'bg-[#15151c] shadow-sm text-red-500' : 'text-gray-400'}`}
                                            title="Bold"
                                        >
                                            <Bold size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleChange('isiFontStyle', selectedElement.isiFontStyle === 'italic' ? 'normal' : 'italic')}
                                            className={`p-1.5 rounded ${selectedElement.isiFontStyle === 'italic' ? 'bg-[#15151c] shadow-sm text-red-500' : 'text-gray-400'}`}
                                            title="Italic"
                                        >
                                            <Italic size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Line Height</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            title="Line height"
                                            value={selectedElement.isiLineHeight || 1.4}
                                            onChange={(e) => handleChange('isiLineHeight', Number(e.target.value))}
                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-gray-400 mb-1 block">Spacing</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            title="Letter spacing"
                                            value={selectedElement.isiLetterSpacing || 0}
                                            onChange={(e) => handleChange('isiLetterSpacing', Number(e.target.value))}
                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="col-span-2">
                                        <label className="text-[11px] text-gray-400 mb-1 block">Font Family</label>
                                        <select
                                            title="Font family"
                                            value={selectedElement.isiFontFamily || 'Arial, Helvetica, sans-serif'}
                                            onChange={(e) => handleChange('isiFontFamily', e.target.value)}
                                            className="w-full border border-[#232330] rounded px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                                        >
                                            <option value="Arial, Helvetica, sans-serif">Sans Serif (System)</option>
                                            <option value="'Times New Roman', serif">Times New Roman</option>
                                            <option value="'Courier New', monospace">Courier New</option>
                                            <option value="Georgia, serif">Georgia</option>
                                            <option value="Verdana, sans-serif">Verdana</option>
                                            <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                                            <option value="'Lucida Sans', sans-serif">Lucida Sans</option>
                                            <option value="Tahoma, sans-serif">Tahoma</option>
                                            <option value="Impact, sans-serif">Impact</option>
                                            <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-[#1a1a21]">
                                <input
                                    type="checkbox"
                                    id="isiAutoStart"
                                    checked={selectedElement.isiAutoStart !== false}
                                    onChange={(e) => handleChange('isiAutoStart', e.target.checked)}
                                    className="rounded border-[#33333f] text-red-500 focus:ring-red-500 h-3 w-3"
                                />
                                <label htmlFor="isiAutoStart" className="text-[11px] text-gray-200 font-medium">
                                    Auto-start after animations
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
