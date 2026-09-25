import React, { useState, useEffect } from 'react';
import { Toolbar, type ToolType } from '../Toolbar/Toolbar';
import { PropertiesPanel } from '../PropertiesPanel/PropertiesPanel';
import { DesignCanvas } from '../Canvas/DesignCanvas';
import {
    Layout,
    Layers,
    Undo2,
    Redo2,
    RefreshCcw,
    Play,
    Pause,
    Plus,
    Download,
    FileCode2,
    ChevronDown,
    Save,
    FolderOpen,
    Loader2,
    Check,
    Cloud,
    Home,
    Bookmark,
    ExternalLink,
} from 'lucide-react';
import { useDesignStore, getArtboardPresets } from '../../store/designStore';
import { VariationsPanel } from '../Variations/VariationsPanel';
import { TemplatesPanel } from '../TemplatesPanel/TemplatesPanel';
import { AssetsPanel } from '../AssetsPanel/AssetsPanel';
import { LayersPanel } from '../LayersPanel/LayersPanel';
import { Timeline } from '../Timeline/Timeline';
import { AnimationDialog } from '../AnimationDialog/AnimationDialog';
import { ProjectsModal } from '../Projects/ProjectsModal';
import type { AppMode } from '../ModeSelect/ModeSelect';
import { getTemplateById } from '../../templates/emrTemplates';
import { saveProjectToFirestore } from '../../services/projectService';
import { uploadProjectThumbnail } from '../../services/storageService';
import { isFirebaseConfigured } from '../../services/firebase';
import { saveBannerTemplate } from '../../services/templateService';
import { collectBannerImageUrls } from '../../utils/bannerImages';
import { SaveTemplateDialog, type SaveTemplateValues } from '../Templates/SaveTemplateDialog';
import { navigate } from '../../router/hashRouter';

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
        // Project metadata
        projectId,
        projectName,
        setProjectId,
        setProjectName,
        isSaving,
        setIsSaving,
        lastSavedAt,
        setLastSavedAt,
        // Canvas attributes
        canvasWidth,
        canvasHeight,
        totalDuration,
        loop,
        canvasBackground,
        canvasBackgroundImage,
        elements,
    } = useDesignStore();

    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [showAddArtboard, setShowAddArtboard] = useState(false);
    const [showCampaign, setShowCampaign] = useState(false);
    const [showProjectsModal, setShowProjectsModal] = useState(false);
    const [campaignSelection, setCampaignSelection] = useState<Set<string>>(new Set());
    const [isAnimationStudioOpen, setIsAnimationStudioOpen] = useState(false);
    const [animationStudioTab, setAnimationStudioTab] = useState<'in' | 'out' | 'sequence'>('in');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [templateSaved, setTemplateSaved] = useState(false);

    const isCloud = isFirebaseConfigured();

    useEffect(() => {
        const handleOpenStudio = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail?.tab) {
                setAnimationStudioTab(customEvent.detail.tab);
            }
            setIsAnimationStudioOpen(true);
        };
        window.addEventListener('open-animation-studio', handleOpenStudio as EventListener);
        return () => window.removeEventListener('open-animation-studio', handleOpenStudio as EventListener);
    }, []);

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

    /**
     * Asks the canvas for a snapshot (the same helper PNG export uses) so both
     * "Save" and "Save as template" can store a thumbnail.
     */
    const captureCanvasThumbnail = (): Promise<string | null> =>
        new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 500);
            window.dispatchEvent(
                new CustomEvent('get-canvas-thumbnail', {
                    detail: {
                        callback: (dataUrl: string | null) => {
                            clearTimeout(timeout);
                            resolve(dataUrl);
                        },
                    },
                })
            );
        });

    const handleSaveProject = async () => {
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const thumbnailDataUrl = await captureCanvasThumbnail();
            const targetId = projectId || `proj_${Date.now()}`;
            let thumbnailUrl: string | undefined = undefined;

            if (thumbnailDataUrl) {
                try {
                    thumbnailUrl = await uploadProjectThumbnail(thumbnailDataUrl, targetId);
                } catch (e) {
                    console.warn('Could not upload thumbnail to storage:', e);
                }
            }

            const savedId = await saveProjectToFirestore({
                id: projectId || undefined,
                name: projectName || 'Untitled Banner',
                mode,
                thumbnailUrl,
                canvasWidth,
                canvasHeight,
                totalDuration,
                loop,
                canvasBackground,
                canvasBackgroundImage,
                artboards,
                elements,
                imageUrls: collectBannerImageUrls(elements, canvasBackgroundImage),
                version: 1,
            });

            setProjectId(savedId);
            setLastSavedAt(Date.now());
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (err) {
            console.error('Failed to save project:', err);
            alert('Failed to save project. Check console for error details.');
        } finally {
            setIsSaving(false);
        }
    };

    /** Stores the current design (all sizes + images) in the template library. */
    const handleSaveAsTemplate = async (values: SaveTemplateValues) => {
        setSavingTemplate(true);
        try {
            const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            let thumbnailUrl: string | undefined = undefined;

            const thumbnailDataUrl = await captureCanvasThumbnail();
            if (thumbnailDataUrl) {
                try {
                    thumbnailUrl = await uploadProjectThumbnail(thumbnailDataUrl, templateId);
                } catch (e) {
                    console.warn('Could not upload template thumbnail:', e);
                }
            }

            await saveBannerTemplate({
                id: templateId,
                name: values.name,
                description: values.description,
                category: values.category,
                mode,
                thumbnailUrl,
                canvasWidth,
                canvasHeight,
                totalDuration,
                loop,
                canvasBackground,
                canvasBackgroundImage,
                artboards,
                elements,
                imageUrls: collectBannerImageUrls(elements, canvasBackgroundImage),
                sourceProjectId: projectId || undefined,
            });

            setShowTemplateDialog(false);
            setTemplateSaved(true);
            setTimeout(() => setTemplateSaved(false), 2500);
        } catch (err) {
            console.error('Failed to save template:', err);
            alert('Failed to save template. Check console for details.');
        } finally {
            setSavingTemplate(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd && e.key === 's') {
                e.preventDefault();
                handleSaveProject();
            } else if (isCtrlOrCmd && e.key === 'z') {
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
    }, [undo, redo, removeElement, selectedId, projectId, projectName, canvasWidth, canvasHeight, elements, artboards]);

    useEffect(() => {
        // A banner loaded from a URL/file already brings its own mode + design,
        // so don't overwrite it with the default starter template.
        if (projectId) return;

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
    }, [mode, projectId, reset, loadTemplate, clearHistory]);

    const availablePresets = getArtboardPresets().filter(
        (p) => !artboards.some((a) => a.width === p.width && a.height === p.height),
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#1e1e26]">
            {/* Header */}
            <header className="h-14 bg-black border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
                <button
                    onClick={() => navigate('/')}
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition shrink-0"
                    title="Back to dashboard"
                >
                    <Home size={16} />
                </button>

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
                    <span
                        className={`hidden md:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            isCloud
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                        title={isCloud ? 'Saving to Firebase Firestore & Storage' : 'Local mode — add Firebase keys in .env for cloud sync'}
                    >
                        <Cloud size={10} />
                        {isCloud ? 'Firebase' : 'Local'}
                    </span>
                </div>

                <div className="h-6 w-px bg-white/10" />

                {/* Project Title & Library Button */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowProjectsModal(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition"
                        title="Browse saved banner projects"
                    >
                        <FolderOpen size={13} className="text-red-400" />
                        <span>Projects</span>
                    </button>

                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Untitled Banner"
                        className="bg-transparent hover:bg-white/5 focus:bg-[#15151c] border border-transparent hover:border-white/10 focus:border-red-500 rounded px-2 py-1 text-xs font-semibold text-gray-100 focus:outline-none transition w-40 max-w-[180px] truncate"
                        title="Click to rename banner project"
                    />

                    <button
                        onClick={handleSaveProject}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition ${
                            saveSuccess
                                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-red-600 hover:bg-red-700 text-white border-red-500'
                        }`}
                        title="Save project to Firestore (Ctrl+S)"
                    >
                        {isSaving ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : saveSuccess ? (
                            <Check size={12} />
                        ) : (
                            <Save size={12} />
                        )}
                        <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save'}</span>
                    </button>

                    <button
                        onClick={() => setShowTemplateDialog(true)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                            templateSaved
                                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-white/5 text-gray-300 hover:text-white border-white/10'
                        }`}
                        title="Save this design (all sizes + images) as a reusable template"
                    >
                        {templateSaved ? <Check size={12} /> : <Bookmark size={12} />}
                        <span className="hidden lg:inline">{templateSaved ? 'Template saved' : 'Save as template'}</span>
                    </button>

                    {projectId && (
                        <button
                            onClick={() => navigate(`/banners/${projectId}`)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-white/10 text-gray-300 hover:text-white transition"
                            title="Open this banner's own page with a live preview"
                        >
                            <ExternalLink size={12} />
                            <span className="hidden xl:inline">Banner page</span>
                        </button>
                    )}

                    {lastSavedAt && !saveSuccess && (
                        <span className="text-[10px] text-gray-400 hidden xl:inline">
                            Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                <div className="h-6 w-px bg-white/10" />

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

            {/* Animation Studio Modal Dialogue */}
            <AnimationDialog
                isOpen={isAnimationStudioOpen}
                onClose={() => setIsAnimationStudioOpen(false)}
                initialTab={animationStudioTab}
            />

            {/* Projects Library Modal */}
            <ProjectsModal
                isOpen={showProjectsModal}
                onClose={() => setShowProjectsModal(false)}
            />

            <SaveTemplateDialog
                isOpen={showTemplateDialog}
                defaultName={projectName ? `${projectName} Template` : 'Untitled Template'}
                isSaving={savingTemplate}
                onClose={() => setShowTemplateDialog(false)}
                onSubmit={handleSaveAsTemplate}
            />

        </div>
    );
};