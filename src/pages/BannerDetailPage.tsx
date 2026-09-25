import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Bookmark,
    Copy,
    Download,
    ExternalLink,
    Image as ImageIcon,
    Layers,
    Loader2,
    PenSquare,
    RefreshCw,
    Trash2,
    Film,
    Clock,
} from 'lucide-react';
import { DashboardShell } from '../components/Shell/DashboardShell';
import { SaveTemplateDialog, type SaveTemplateValues } from '../components/Templates/SaveTemplateDialog';
import {
    deleteProject,
    loadProject,
    saveProjectToFirestore,
    type FirebaseProject,
} from '../services/projectService';
import { saveBannerTemplate } from '../services/templateService';
import { uploadProjectThumbnail } from '../services/storageService';
import { subscribeToAssets, type FirebaseAsset } from '../services/assetService';
import { buildBannerPackage, buildPreviewHtml, zipBannerPackage } from '../utils/bannerPackage';
import { navigate } from '../router/hashRouter';
import { formatDateTime } from '../utils/format';

interface BannerDetailPageProps {
    /** Project id from the `#/banners/:id` route. */
    id: string;
}

/**
 * The dedicated page for one created banner: live animated preview (built from
 * the same export pipeline used for the ZIP), metadata, size list and the
 * images that belong to it.
 */
export const BannerDetailPage: React.FC<BannerDetailPageProps> = ({ id }) => {
    const [project, setProject] = useState<FirebaseProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [assets, setAssets] = useState<FirebaseAsset[]>([]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setNotFound(false);
            try {
                const loaded = await loadProject(id);
                if (cancelled) return;
                if (!loaded) {
                    setNotFound(true);
                } else {
                    setProject(loaded);
                }
            } catch (err) {
                console.error('Failed to load banner:', err);
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    // Assets uploaded from this banner's editor session.
    useEffect(() => {
        const unsubscribe = subscribeToAssets((all) => {
            setAssets(all.filter((asset) => asset.projectId === id));
        });
        return () => unsubscribe();
    }, [id]);

    const buildPreview = async (target: FirebaseProject) => {
        setPreviewLoading(true);
        try {
            const pkg = await buildBannerPackage({
                canvasWidth: target.canvasWidth,
                canvasHeight: target.canvasHeight,
                canvasBackground: target.canvasBackground,
                canvasBackgroundImage: target.canvasBackgroundImage,
                totalDuration: target.totalDuration,
                loop: target.loop,
                elements: target.elements,
                inlineRemoteImages: true,
            });
            setPreviewHtml(buildPreviewHtml(pkg));
            setPreviewKey((k) => k + 1);
        } catch (err) {
            console.error('Failed to build banner preview:', err);
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        if (project) buildPreview(project);
    }, [project]);

    const handleDownloadHtml = async () => {
        if (!project) return;
        setDownloading(true);
        try {
            const pkg = await buildBannerPackage({
                canvasWidth: project.canvasWidth,
                canvasHeight: project.canvasHeight,
                canvasBackground: project.canvasBackground,
                canvasBackgroundImage: project.canvasBackgroundImage,
                totalDuration: project.totalDuration,
                loop: project.loop,
                elements: project.elements,
            });
            const blob = await zipBannerPackage(pkg);
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `banner-package-${project.canvasWidth}x${project.canvasHeight}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('Failed to download banner package:', err);
            alert('Failed to download the banner package.');
        } finally {
            setDownloading(false);
        }
    };

    const handleDuplicate = async () => {
        if (!project) return;
        setActionLoading(true);
        try {
            const newId = await saveProjectToFirestore({
                ...project,
                id: undefined,
                name: `${project.name} (Copy)`,
            });
            navigate(`/banners/${newId}`);
        } catch (err) {
            console.error('Failed to duplicate banner:', err);
            alert('Failed to duplicate banner.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!project) return;
        if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

        setActionLoading(true);
        try {
            await deleteProject(project.id);
            navigate('/banners');
        } catch (err) {
            console.error('Failed to delete banner:', err);
            alert('Failed to delete banner.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveTemplate = async (values: SaveTemplateValues) => {
        if (!project) return;
        setSavingTemplate(true);
        try {
            const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            let thumbnailUrl = project.thumbnailUrl;

            if (project.thumbnailUrl) {
                try {
                    thumbnailUrl = await uploadProjectThumbnail(project.thumbnailUrl, templateId);
                } catch (err) {
                    console.warn('Could not copy thumbnail for template:', err);
                }
            }

            await saveBannerTemplate({
                id: templateId,
                name: values.name,
                description: values.description,
                category: values.category,
                mode: project.mode,
                thumbnailUrl,
                canvasWidth: project.canvasWidth,
                canvasHeight: project.canvasHeight,
                totalDuration: project.totalDuration,
                loop: project.loop,
                canvasBackground: project.canvasBackground,
                canvasBackgroundImage: project.canvasBackgroundImage,
                artboards: project.artboards,
                elements: project.elements,
                imageUrls: project.imageUrls,
                sourceProjectId: project.id,
            });

            setShowTemplateDialog(false);
        } catch (err) {
            console.error('Failed to save template:', err);
            alert('Failed to save template.');
        } finally {
            setSavingTemplate(false);
        }
    };

    const bannerImages = useMemo(() => {
        if (!project) return [] as Array<{ url: string; name: string; fromLibrary: boolean }>;
        const seen = new Set<string>();
        const list: Array<{ url: string; name: string; fromLibrary: boolean }> = [];

        for (const asset of assets) {
            if (seen.has(asset.downloadUrl)) continue;
            seen.add(asset.downloadUrl);
            list.push({ url: asset.downloadUrl, name: asset.name, fromLibrary: true });
        }

        for (const url of project.imageUrls || []) {
            if (seen.has(url)) continue;
            seen.add(url);
            const name = url.startsWith('data:') ? 'Inline image' : url.split('/').pop()?.split('?')[0] || 'Image';
            list.push({ url, name, fromLibrary: false });
        }

        return list;
    }, [project, assets]);

    if (loading) {
        return (
            <DashboardShell activePath="/banners">
                <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-3">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="text-sm">Loading banner...</span>
                </div>
            </DashboardShell>
        );
    }

    if (notFound || !project) {
        return (
            <DashboardShell activePath="/banners">
                <div className="flex flex-col items-center justify-center py-32 text-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-100">Banner not found</h2>
                    <p className="text-sm text-gray-400">It may have been deleted or the link is incorrect.</p>
                    <button
                        onClick={() => navigate('/banners')}
                        className="mt-2 px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                    >
                        Back to banners
                    </button>
                </div>
            </DashboardShell>
        );
    }

    const previewScale = Math.min(1, 760 / project.canvasWidth, 460 / project.canvasHeight);

    return (
        <DashboardShell activePath="/banners">
            <div className="mx-auto max-w-7xl px-6 py-8">
                <button
                    onClick={() => navigate('/banners')}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
                >
                    <ArrowLeft size={13} /> All banners
                </button>

                <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-50">{project.name}</h1>
                            <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                    project.mode === 'animated'
                                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}
                            >
                                {project.mode === 'animated' ? 'ANIMATED' : 'EMR'}
                            </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                            <span>{project.canvasWidth}×{project.canvasHeight}px</span>
                            <span>·</span>
                            <span>{project.artboards.length} size{project.artboards.length !== 1 ? 's' : ''}</span>
                            <span>·</span>
                            <span>{project.totalDuration}s {project.loop ? 'loop' : 'once'}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                                <Clock size={10} /> updated {formatDateTime(project.updatedAt)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => navigate(`/builder/${project.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                        >
                            <PenSquare size={13} /> Open in editor
                        </button>
                        <button
                            onClick={() => setShowTemplateDialog(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#2a2a35] text-gray-300 hover:border-red-500/60 hover:text-white transition"
                        >
                            <Bookmark size={13} /> Save as template
                        </button>
                        <button
                            onClick={handleDownloadHtml}
                            disabled={downloading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#2a2a35] text-gray-300 hover:border-red-500/60 hover:text-white transition disabled:opacity-40"
                        >
                            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download HTML
                        </button>
                        <button
                            onClick={handleDuplicate}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#2a2a35] text-gray-300 hover:border-red-500/60 hover:text-white transition disabled:opacity-40"
                        >
                            <Copy size={13} /> Duplicate
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#2a2a35] text-gray-300 hover:border-red-500/60 hover:text-red-400 transition disabled:opacity-40"
                        >
                            <Trash2 size={13} /> Delete
                        </button>
                    </div>
                </div>

                <div className="mt-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">

                    {/* Live preview built from the exported banner package */}
                    <div className="bg-[#15151c] border border-[#2a2a35] rounded-xl p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Film size={15} className="text-red-500" />
                                <h2 className="text-sm font-semibold text-gray-100">Live preview</h2>
                                <span className="text-[10px] text-gray-500">exported HTML · animated</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => buildPreview(project)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-gray-300 border border-[#2a2a35] hover:text-white hover:border-red-500/60 transition"
                                >
                                    <RefreshCw size={11} className={previewLoading ? 'animate-spin' : ''} /> Replay
                                </button>
                                <button
                                    onClick={() => navigate(`/builder/${project.id}`)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-gray-300 border border-[#2a2a35] hover:text-white hover:border-red-500/60 transition"
                                >
                                    <ExternalLink size={11} /> Edit
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center bg-[#121217] border border-[#232330] rounded-lg p-4 overflow-auto">
                            {previewHtml ? (
                                <div
                                    className="relative overflow-hidden rounded-md bg-white shadow-lg"
                                    style={{ width: project.canvasWidth * previewScale, height: project.canvasHeight * previewScale }}
                                >
                                    <iframe
                                        key={previewKey}
                                        title={`${project.name} preview`}
                                        srcDoc={previewHtml}
                                        sandbox="allow-scripts"
                                        scrolling="no"
                                        style={{
                                            width: project.canvasWidth,
                                            height: project.canvasHeight,
                                            border: '0',
                                            transform: `scale(${previewScale})`,
                                            transformOrigin: 'top left',
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center gap-2 text-gray-500">
                                    <Loader2 size={20} className="animate-spin" />
                                    <span className="text-xs">Building preview...</span>
                                </div>
                            )}
                        </div>
                        <p className="mt-3 text-[11px] text-gray-500">
                            This is the real exported banner (index.html + css + js) rendered in an isolated frame.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Details */}
                        <div className="bg-[#15151c] border border-[#2a2a35] rounded-xl p-5">
                            <h2 className="text-sm font-semibold text-gray-100">Banner details</h2>
                            <dl className="mt-3 space-y-2 text-[12px]">
                                {[
                                    ['Mode', project.mode === 'animated' ? 'Animated banner' : 'EMR static banner'],
                                    ['Canvas', `${project.canvasWidth} × ${project.canvasHeight}px`],
                                    ['Duration', `${project.totalDuration}s (${project.loop ? 'loops' : 'plays once'})`],
                                    ['Background', project.canvasBackground],
                                    ['Created', formatDateTime(project.createdAt)],
                                    ['Updated', formatDateTime(project.updatedAt)],
                                    ['Version', `v${project.version}`],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between gap-3">
                                        <dt className="text-gray-500">{label}</dt>
                                        <dd className="text-gray-200 truncate max-w-[180px]" title={String(value)}>{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        {/* Sizes */}
                        <div className="bg-[#15151c] border border-[#2a2a35] rounded-xl p-5">
                            <div className="flex items-center gap-2">
                                <Layers size={14} className="text-red-500" />
                                <h2 className="text-sm font-semibold text-gray-100">Sizes in this banner</h2>
                            </div>
                            <ul className="mt-3 space-y-2">
                                {project.artboards.map((board) => (
                                    <li
                                        key={board.id}
                                        className="flex items-center justify-between px-3 py-2 bg-[#1a1a21] border border-[#232330] rounded-lg text-[12px]"
                                    >
                                        <span className="text-gray-200 truncate">{board.label}</span>
                                        <span className="text-gray-500 shrink-0 ml-3">
                                            {board.width}×{board.height} · {board.elements.length} layers
                                        </span>
                                    </li>
                                ))}
                                {project.artboards.length === 0 && (
                                    <li className="text-[12px] text-gray-500">{project.canvasWidth}×{project.canvasHeight} (single size)</li>
                                )}
                            </ul>
                        </div>

                        {/* Images belonging to this banner */}
                        <div className="bg-[#15151c] border border-[#2a2a35] rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ImageIcon size={14} className="text-red-500" />
                                    <h2 className="text-sm font-semibold text-gray-100">Images in this banner</h2>
                                </div>
                                <span className="text-[11px] text-gray-500">{bannerImages.length}</span>
                            </div>

                            {bannerImages.length === 0 ? (
                                <p className="mt-3 text-[12px] text-gray-500">
                                    No images stored yet — upload images from the editor and save the banner to keep them here.
                                </p>
                            ) : (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {bannerImages.map((image) => (
                                        <a
                                            key={image.url}
                                            href={image.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group relative aspect-square rounded-lg overflow-hidden border border-[#232330] bg-[#121217]"
                                            title={`${image.name}${image.fromLibrary ? ' (asset library)' : ''}`}
                                        >
                                            <img src={image.url} alt={image.name} className="w-full h-full object-cover" loading="lazy" />
                                            <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[9px] text-gray-300 px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition">
                                                {image.name}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <SaveTemplateDialog
                isOpen={showTemplateDialog}
                defaultName={`${project.name} Template`}
                isSaving={savingTemplate}
                onClose={() => setShowTemplateDialog(false)}
                onSubmit={handleSaveTemplate}
            />
        </DashboardShell>
    );
};
