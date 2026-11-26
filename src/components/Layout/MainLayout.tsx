import React, { useState, useEffect } from 'react';
import { Toolbar, type ToolType } from '../Toolbar/Toolbar';
import { PropertiesPanel } from '../PropertiesPanel/PropertiesPanel';
import { DesignCanvas } from '../Canvas/DesignCanvas';
import { useShallow } from 'zustand/react/shallow';
import { useDesignStore, getArtboardPresets } from '../../store/designStore';
import { VariationsPanel } from '../Variations/VariationsPanel';
import { TemplatesPanel } from '../TemplatesPanel/TemplatesPanel';
import { AssetsPanel } from '../AssetsPanel/AssetsPanel';
import { LayersPanel } from '../LayersPanel/LayersPanel';
import { Timeline } from '../Timeline/Timeline';
import { AnimationDialog, type AnimationStudioTab } from '../AnimationDialog/AnimationDialog';
import { ProjectsModal } from '../Projects/ProjectsModal';
import type { AppMode } from '../ModeSelect/ModeSelect';
import { getTemplateById } from '../../templates/emrTemplates';
import { saveProjectToFirestore } from '../../services/projectService';
import { uploadProjectThumbnail } from '../../services/storageService';
import { saveBannerTemplate } from '../../services/templateService';
import { collectBannerImageUrls } from '../../utils/bannerImages';
import { SaveTemplateDialog, type SaveTemplateValues } from '../Templates/SaveTemplateDialog';
import { EditorHeader } from './EditorHeader';
import { useMediaQuery, BREAKPOINTS } from '../../hooks/useMediaQuery';

type MainLayoutProps = {
    mode: AppMode;
    onChangeMode?: () => void;
};

export const MainLayout: React.FC<MainLayoutProps> = ({ mode, onChangeMode }) => {
    const {
        selectedId,
        undo,
        redo,
        removeElement,
        reset,
        loadTemplate,
        clearHistory,
        artboards,
        activeArtboardId,
        addCampaignSizes,
        projectId,
        projectName,
        setProjectId,
        setIsSaving,
        setLastSavedAt,
        canvasWidth,
        canvasHeight,
        totalDuration,
        loop,
        canvasBackground,
        canvasBackgroundImage,
        useAsClickTag,
        clickTagUrl,
        clickTagTarget,
        elements,
    } = useDesignStore(useShallow((s) => ({
        selectedId: s.selectedId,
        undo: s.undo,
        redo: s.redo,
        removeElement: s.removeElement,
        reset: s.reset,
        loadTemplate: s.loadTemplate,
        clearHistory: s.clearHistory,
        artboards: s.artboards,
        activeArtboardId: s.activeArtboardId,
        addCampaignSizes: s.addCampaignSizes,
        projectId: s.projectId,
        projectName: s.projectName,
        setProjectId: s.setProjectId,
        setIsSaving: s.setIsSaving,
        setLastSavedAt: s.setLastSavedAt,
        canvasWidth: s.canvasWidth,
        canvasHeight: s.canvasHeight,
        totalDuration: s.totalDuration,
        loop: s.loop,
        canvasBackground: s.canvasBackground,
        canvasBackgroundImage: s.canvasBackgroundImage,
        useAsClickTag: s.useAsClickTag,
        clickTagUrl: s.clickTagUrl,
        clickTagTarget: s.clickTagTarget,
        elements: s.elements,
    })));

    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [showCampaign, setShowCampaign] = useState(false);
    const [showProjectsModal, setShowProjectsModal] = useState(false);
    const [campaignSelection, setCampaignSelection] = useState<Set<string>>(new Set());
    const [isAnimationStudioOpen, setIsAnimationStudioOpen] = useState(false);
    const [animationStudioTab, setAnimationStudioTab] = useState<AnimationStudioTab>('in');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [templateSaved, setTemplateSaved] = useState(false);

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
                useAsClickTag,
                clickTagUrl,
                clickTagTarget,
                artboards,
                activeArtboardId,
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
                useAsClickTag,
                clickTagUrl,
                clickTagTarget,
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

    const isLg = useMediaQuery(BREAKPOINTS.lg);
    const isMd = useMediaQuery(BREAKPOINTS.md);
    const isXl = useMediaQuery(BREAKPOINTS.xl);
    const [propsOpen, setPropsOpen] = useState(false);

    // Tablet widths: selecting a layer slides the Properties drawer in (phones
    // keep the canvas clear and use the header toggle instead).
    useEffect(() => {
        if (selectedId && isMd && !isXl) setPropsOpen(true);
    }, [selectedId, isMd, isXl]);

    const sidePanel =
        activeTool === 'layers' ? <LayersPanel /> :
        activeTool === 'assets' ? <AssetsPanel /> :
        activeTool === 'templates' ? <TemplatesPanel /> :
        activeTool === 'variations' ? <VariationsPanel /> :
        null;

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0f]">
            <EditorHeader
                mode={mode}
                onChangeMode={onChangeMode}
                onSave={handleSaveProject}
                saveSuccess={saveSuccess}
                onOpenProjects={() => setShowProjectsModal(true)}
                onSaveTemplate={() => setShowTemplateDialog(true)}
                templateSaved={templateSaved}
                onOpenCampaign={() => setShowCampaign(true)}
                propertiesToggle={isXl ? undefined : { open: propsOpen, onToggle: () => setPropsOpen((v) => !v) }}
            />

            {/* Main Content — panels dock on wide screens and become overlays /
                drawers on narrower ones so the canvas always keeps its space. */}
            <div className="flex flex-1 overflow-hidden relative">
                <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
                <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a21]">
                    <div className="flex-1 flex min-h-0 relative">
                        {sidePanel && (isLg ? sidePanel : (
                            <>
                                <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={() => setActiveTool('select')} />
                                <div className="absolute left-0 top-0 bottom-0 z-50 flex max-w-[88vw] shadow-[8px_0_30px_rgba(0,0,0,0.5)]">
                                    {sidePanel}
                                </div>
                            </>
                        ))}
                        <DesignCanvas />
                    </div>
                    <Timeline />
                </div>
                {isXl ? (
                    <PropertiesPanel />
                ) : (
                    <>
                        {propsOpen && (
                            <div className="absolute inset-0 z-[55] bg-black/40 backdrop-blur-[1px]" onClick={() => setPropsOpen(false)} />
                        )}
                        <div
                            className={`absolute top-0 right-0 bottom-0 z-[56] flex max-w-[92vw] transition-transform duration-200 ease-out shadow-[-8px_0_30px_rgba(0,0,0,0.5)] ${propsOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
                            aria-hidden={!propsOpen}
                        >
                            <PropertiesPanel />
                        </div>
                    </>
                )}
            </div>

            {/* Multi-size campaign modal */}
            {showCampaign && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40" onClick={() => setShowCampaign(false)}>
                    <div className="bg-[#15151c] rounded-xl shadow-2xl w-full max-w-[560px] sm:max-w-[720px] mx-2 sm:mx-0 max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                key={animationStudioTab}
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