import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
    Layout,
    Undo2,
    Redo2,
    RefreshCcw,
    Play,
    Square,
    Plus,
    Download,
    FileCode2,
    ChevronDown,
    Save,
    FolderOpen,
    Loader2,
    Check,
    Home,
    Bookmark,
    ExternalLink,
    MoreHorizontal,
    Layers,
    SlidersHorizontal,
    Image as ImageIcon,
} from 'lucide-react';
import { useDesignStore, getArtboardPresets } from '../../store/designStore';
import type { AppMode } from '../ModeSelect/ModeSelect';
import { navigate } from '../../router/hashRouter';
import { useMediaQuery, BREAKPOINTS } from '../../hooks/useMediaQuery';

/** Closes a popover when clicking outside it or pressing Escape. */
const useDismiss = (open: boolean, close: () => void) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) close();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, close]);
    return ref;
};

const Divider = () => <div className="h-6 w-px bg-white/[0.07] shrink-0" />;

/** Square ghost icon button. */
const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> = ({ active, className = '', children, ...rest }) => (
    <button
        {...rest}
        className={`h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg transition
            disabled:opacity-30 disabled:cursor-not-allowed
            ${active ? 'bg-white/10 text-white' : 'text-[#8b8b9e] hover:text-white hover:bg-white/[0.06]'} ${className}`}
    >
        {children}
    </button>
);

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean }> = ({ icon, label, hint, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-[#d6d6e2] hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition text-left"
    >
        <span className="text-[#8b8b9e] shrink-0">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {hint && <span className="text-[10px] text-[#5d5d70] font-mono">{hint}</span>}
    </button>
);

const MENU_CLASS =
    'absolute top-full mt-2 z-[10000] min-w-[220px] p-1.5 rounded-xl border border-white/[0.08] bg-[#14141c]/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.55)]';

interface EditorHeaderProps {
    mode: AppMode;
    onChangeMode?: () => void;
    onSave: () => void;
    saveSuccess: boolean;
    onOpenProjects: () => void;
    onSaveTemplate: () => void;
    templateSaved: boolean;
    onOpenCampaign: () => void;
    /** Shown when the Properties panel is a drawer (narrow screens). */
    propertiesToggle?: { open: boolean; onToggle: () => void };
}

/**
 * Editor top bar. Three zones — identity + project (left), banner sizes
 * (centre), history + preview + export (right) — that collapse progressively:
 * sizes turn into a dropdown below `lg`, secondary actions move into the "⋯"
 * menu, and labels drop to icons on small screens so it never wraps.
 */
export const EditorHeader: React.FC<EditorHeaderProps> = ({
    mode,
    onChangeMode,
    onSave,
    saveSuccess,
    onOpenProjects,
    onSaveTemplate,
    templateSaved,
    onOpenCampaign,
    propertiesToggle,
}) => {
    const {
        undo, redo, canUndo, canRedo, artboards, activeArtboardId, setActiveArtboard, addArtboard,
        isPlaying, setIsPlaying, projectId, projectName, setProjectName, isSaving, lastSavedAt,
    } = useDesignStore(useShallow((s) => ({
        undo: s.undo,
        redo: s.redo,
        canUndo: s.past.length > 0,
        canRedo: s.future.length > 0,
        artboards: s.artboards,
        activeArtboardId: s.activeArtboardId,
        setActiveArtboard: s.setActiveArtboard,
        addArtboard: s.addArtboard,
        isPlaying: s.isPlaying,
        setIsPlaying: s.setIsPlaying,
        projectId: s.projectId,
        projectName: s.projectName,
        setProjectName: s.setProjectName,
        isSaving: s.isSaving,
        lastSavedAt: s.lastSavedAt,
    })));

    const isSm = useMediaQuery(BREAKPOINTS.sm);
    const isLg = useMediaQuery(BREAKPOINTS.lg);
    const isXl = useMediaQuery(BREAKPOINTS.xl);

    const [sizesOpen, setSizesOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const sizesRef = useDismiss(sizesOpen, () => setSizesOpen(false));
    const addRef = useDismiss(addOpen, () => setAddOpen(false));
    const exportRef = useDismiss(exportOpen, () => setExportOpen(false));
    const moreRef = useDismiss(moreOpen, () => setMoreOpen(false));

    const activeBoard = artboards.find((a) => a.id === activeArtboardId) || artboards[0];
    const availablePresets = getArtboardPresets().filter(
        (p) => !artboards.some((a) => a.width === p.width && a.height === p.height),
    );
    const savedLabel = lastSavedAt
        ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Not saved yet';

    const addSizeMenu = (
        <div className={`${MENU_CLASS} right-0 max-h-[60vh] overflow-y-auto`}>
            <div className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5d5d70]">Add size</div>
            {availablePresets.length === 0 && <div className="px-2.5 py-2 text-xs text-[#8b8b9e]">All common sizes added</div>}
            {availablePresets.map((p) => (
                <MenuItem
                    key={p.label}
                    icon={<Plus size={13} />}
                    label={p.label}
                    hint={`${p.width}×${p.height}`}
                    onClick={() => { addArtboard(p.width, p.height, p.label); setAddOpen(false); setSizesOpen(false); }}
                />
            ))}
            <div className="my-1 h-px bg-white/[0.06]" />
            <MenuItem icon={<Layers size={13} />} label="Multi-size campaign…" onClick={() => { onOpenCampaign(); setAddOpen(false); setSizesOpen(false); }} />
        </div>
    );

    return (
        <header className="h-14 shrink-0 flex items-center gap-2 px-2 sm:px-3 bg-[#0e0e14]/95 backdrop-blur-xl border-b border-white/[0.06] relative z-[60]">
            {/* ── Left: identity + project ───────────────────────────────── */}
            <IconButton onClick={() => navigate('/')} title="Back to dashboard">
                <Home size={16} />
            </IconButton>

            <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c8ff00] to-[#00d4aa] flex items-center justify-center text-[#0a0a0f] shadow-[0_4px_14px_rgba(0,212,170,0.25)]">
                    <Layout size={16} />
                </div>
                {isXl && (
                    <div className="leading-tight">
                        <div className="text-[13px] font-semibold text-white tracking-tight">Banner Studio</div>
                        <div className={`text-[9.5px] font-bold tracking-wider ${mode === 'emr' ? 'text-[#c8ff00]' : 'text-[#00d4aa]'}`}>
                            {mode === 'emr' ? 'EMR' : 'ANIMATED'}
                        </div>
                    </div>
                )}
            </div>

            <Divider />

            {/* Project name + save */}
            <div className="flex items-center gap-1.5 min-w-0">
                <div className="min-w-0">
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Untitled Banner"
                        className="w-[104px] sm:w-[150px] xl:w-[190px] bg-transparent hover:bg-white/[0.04] focus:bg-white/[0.06] rounded-md px-2 py-0.5 text-[13px] font-semibold text-white placeholder-[#5d5d70] focus:outline-none focus:ring-1 focus:ring-[#00d4aa]/50 truncate transition"
                        title="Rename banner"
                    />
                    {isSm && (
                        <div className="px-2 flex items-center gap-1 text-[10px] text-[#6d6d80] leading-none">
                            <span className={`w-1.5 h-1.5 rounded-full ${lastSavedAt ? 'bg-[#00d4aa]' : 'bg-[#f0a050]'}`} />
                            {isSaving ? 'Saving…' : savedLabel}
                        </div>
                    )}
                </div>
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className={`h-8 shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition ${saveSuccess
                        ? 'bg-[#00d4aa]/15 text-[#00d4aa]'
                        : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'}`}
                    title="Save project (Ctrl+S)"
                >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : saveSuccess ? <Check size={13} /> : <Save size={13} />}
                    {isSm && <span>{isSaving ? 'Saving' : saveSuccess ? 'Saved' : 'Save'}</span>}
                </button>
            </div>

            {/* ── Centre: sizes ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 flex justify-center">
                {isLg ? (
                    <div className="flex items-center gap-1 min-w-0 max-w-full p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                            {artboards.map((ab) => {
                                const active = activeArtboardId === ab.id;
                                return (
                                    <button
                                        key={ab.id}
                                        onClick={() => setActiveArtboard(ab.id)}
                                        className={`h-7 shrink-0 px-2.5 rounded-lg text-[11.5px] font-medium tabular-nums transition ${active
                                            ? 'bg-[#c8ff00] text-[#0a0a0f] shadow-[0_2px_10px_rgba(200,255,0,0.25)]'
                                            : 'text-[#8b8b9e] hover:text-white hover:bg-white/[0.06]'}`}
                                        title={`${ab.label} — ${ab.width}×${ab.height}`}
                                    >
                                        {ab.width}×{ab.height}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative shrink-0" ref={addRef}>
                            <IconButton onClick={() => setAddOpen((v) => !v)} active={addOpen} title="Add banner size" className="!h-7 !w-7">
                                <Plus size={14} />
                            </IconButton>
                            {addOpen && addSizeMenu}
                        </div>
                    </div>
                ) : (
                    <div className="relative" ref={sizesRef}>
                        <button
                            onClick={() => setSizesOpen((v) => !v)}
                            className="h-8 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold tabular-nums bg-white/[0.04] border border-white/[0.07] text-white hover:bg-white/[0.08] transition"
                            title="Switch banner size"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00]" />
                            {activeBoard ? `${activeBoard.width}×${activeBoard.height}` : 'Size'}
                            <ChevronDown size={13} className="text-[#8b8b9e]" />
                        </button>
                        {sizesOpen && (
                            <div className={`${MENU_CLASS} left-1/2 -translate-x-1/2 max-h-[65vh] overflow-y-auto`}>
                                <div className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5d5d70]">Sizes</div>
                                {artboards.map((ab) => (
                                    <MenuItem
                                        key={ab.id}
                                        icon={activeArtboardId === ab.id ? <Check size={13} className="text-[#c8ff00]" /> : <span className="inline-block w-[13px]" />}
                                        label={`${ab.width}×${ab.height}`}
                                        hint={ab.label}
                                        onClick={() => { setActiveArtboard(ab.id); setSizesOpen(false); }}
                                    />
                                ))}
                                <div className="my-1 h-px bg-white/[0.06]" />
                                {availablePresets.slice(0, 6).map((p) => (
                                    <MenuItem
                                        key={p.label}
                                        icon={<Plus size={13} />}
                                        label={`Add ${p.width}×${p.height}`}
                                        hint={p.label}
                                        onClick={() => { addArtboard(p.width, p.height, p.label); setSizesOpen(false); }}
                                    />
                                ))}
                                <MenuItem icon={<Layers size={13} />} label="Multi-size campaign…" onClick={() => { onOpenCampaign(); setSizesOpen(false); }} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Right: history, preview, export ───────────────────────── */}
            {isSm && (
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] shrink-0">
                    <IconButton onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="!h-7 !w-7"><Undo2 size={15} /></IconButton>
                    <IconButton onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="!h-7 !w-7"><Redo2 size={15} /></IconButton>
                </div>
            )}

            {isXl && (
                <>
                    <IconButton onClick={onOpenProjects} title="Projects library"><FolderOpen size={16} /></IconButton>
                    <IconButton onClick={onSaveTemplate} title="Save as template" active={templateSaved}>
                        {templateSaved ? <Check size={16} className="text-[#00d4aa]" /> : <Bookmark size={16} />}
                    </IconButton>
                </>
            )}

            {/* More menu: everything that doesn't fit at this width */}
            <div className="relative shrink-0" ref={moreRef}>
                <IconButton onClick={() => setMoreOpen((v) => !v)} active={moreOpen} title="More">
                    <MoreHorizontal size={17} />
                </IconButton>
                {moreOpen && (
                    <div className={`${MENU_CLASS} right-0`}>
                        {!isSm && (
                            <>
                                <MenuItem icon={<Undo2 size={14} />} label="Undo" hint="Ctrl+Z" disabled={!canUndo} onClick={() => { undo(); }} />
                                <MenuItem icon={<Redo2 size={14} />} label="Redo" hint="Ctrl+Y" disabled={!canRedo} onClick={() => { redo(); }} />
                                <div className="my-1 h-px bg-white/[0.06]" />
                            </>
                        )}
                        <MenuItem icon={<FolderOpen size={14} />} label="Projects library" onClick={() => { onOpenProjects(); setMoreOpen(false); }} />
                        <MenuItem
                            icon={templateSaved ? <Check size={14} className="text-[#00d4aa]" /> : <Bookmark size={14} />}
                            label={templateSaved ? 'Template saved' : 'Save as template'}
                            onClick={() => { onSaveTemplate(); setMoreOpen(false); }}
                        />
                        {projectId && (
                            <MenuItem icon={<ExternalLink size={14} />} label="Open banner page" onClick={() => { navigate(`/banners/${projectId}`); setMoreOpen(false); }} />
                        )}
                        <MenuItem icon={<Layers size={14} />} label="Multi-size campaign…" onClick={() => { onOpenCampaign(); setMoreOpen(false); }} />
                        {onChangeMode && (
                            <>
                                <div className="my-1 h-px bg-white/[0.06]" />
                                <MenuItem
                                    icon={<RefreshCcw size={14} />}
                                    label={`Switch mode (${mode === 'emr' ? 'EMR' : 'Animated'})`}
                                    onClick={() => { onChangeMode(); setMoreOpen(false); }}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>

            {propertiesToggle && (
                <IconButton onClick={propertiesToggle.onToggle} active={propertiesToggle.open} title="Properties panel">
                    <SlidersHorizontal size={16} />
                </IconButton>
            )}

            <Divider />

            <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`h-8 shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-[12px] font-semibold transition border ${isPlaying
                    ? 'bg-white text-[#0e0e14] border-white'
                    : 'bg-transparent text-white border-white/[0.14] hover:bg-white/[0.06]'}`}
                title={isPlaying ? 'Stop preview' : 'Preview animation'}
            >
                {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                {isSm && <span>{isPlaying ? 'Stop' : 'Preview'}</span>}
            </button>

            <div className="relative shrink-0 flex" ref={exportRef}>
                <button
                    onClick={() => window.dispatchEvent(new Event('export-html'))}
                    className="h-8 inline-flex items-center gap-1.5 rounded-l-lg pl-2.5 sm:pl-3 pr-2 text-[12px] font-semibold text-white bg-gradient-to-b from-[#f2564b] to-[#d93a30] hover:from-[#f66a60] hover:to-[#e04338] shadow-[0_4px_14px_rgba(242,86,75,0.3)] transition"
                    title="Export HTML5 banner package (.zip)"
                >
                    <FileCode2 size={14} />
                    {isSm && <span>Export</span>}
                </button>
                <button
                    onClick={() => setExportOpen((v) => !v)}
                    className="h-8 inline-flex items-center rounded-r-lg px-1.5 text-white bg-gradient-to-b from-[#f2564b] to-[#d93a30] hover:from-[#f66a60] hover:to-[#e04338] border-l border-black/20 transition"
                    title="More export options"
                >
                    <ChevronDown size={14} />
                </button>
                {exportOpen && (
                    <div className={`${MENU_CLASS} right-0`}>
                        <MenuItem
                            icon={<FileCode2 size={14} />}
                            label="HTML5 package"
                            hint=".zip"
                            onClick={() => { window.dispatchEvent(new Event('export-html')); setExportOpen(false); }}
                        />
                        <MenuItem
                            icon={<ImageIcon size={14} />}
                            label="PNG image"
                            hint=".png"
                            onClick={() => { window.dispatchEvent(new Event('export-canvas')); setExportOpen(false); }}
                        />
                        <MenuItem
                            icon={<Download size={14} />}
                            label="Both"
                            onClick={() => {
                                window.dispatchEvent(new Event('export-html'));
                                window.dispatchEvent(new Event('export-canvas'));
                                setExportOpen(false);
                            }}
                        />
                    </div>
                )}
            </div>
        </header>
    );
};
