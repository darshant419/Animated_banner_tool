import React, { useEffect, useState } from 'react';
import {
    LayoutTemplate,
    Images,
    FolderOpen,
    Plus,
    ArrowRight,
    Loader2,
    Bookmark,
    Play,
} from 'lucide-react';
import { DashboardShell } from '../components/Shell/DashboardShell';
import { TemplateThumb } from '../components/Templates/TemplateThumb';
import { listProjects, type ProjectSummary } from '../services/projectService';
import { listBannerTemplates, loadBannerTemplate, type BannerTemplateSummary } from '../services/templateService';
import { subscribeToAssets, type FirebaseAsset } from '../services/assetService';
import { BANNER_TEMPLATES } from '../templates/emrTemplates';
import { useDesignStore } from '../store/designStore';
import { navigate } from '../router/hashRouter';
import { formatRelativeTime } from '../utils/format';

/**
 * Dashboard home — quick overview of created banners, stored templates and
 * uploaded images, with shortcuts into each page (mirrors the email builder's
 * dashboard).
 */
export const DashboardPage: React.FC = () => {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [templates, setTemplates] = useState<BannerTemplateSummary[]>([]);
    const [assets, setAssets] = useState<FirebaseAsset[]>([]);
    const [loading, setLoading] = useState(true);

    const { loadTemplateState, loadTemplate } = useDesignStore();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [projectList, templateList] = await Promise.all([listProjects(), listBannerTemplates()]);
                setProjects(projectList);
                setTemplates(templateList);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToAssets(setAssets);
        return () => unsubscribe();
    }, []);

    const handleUseTemplate = async (id: string) => {
        const template = await loadBannerTemplate(id);
        if (!template) {
            alert('Template not found.');
            return;
        }
        loadTemplateState(template);
        navigate('/builder');
    };

    const stats = [
        { label: 'Created banners', value: projects.length, icon: FolderOpen, path: '/banners' },
        { label: 'Saved templates', value: templates.length, icon: LayoutTemplate, path: '/templates' },
        { label: 'Images', value: assets.length, icon: Images, path: '/images' },
    ];

    return (
        <DashboardShell activePath="/">
            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-50">Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-400">
                            Build animated HTML5 banners, keep them as templates, and manage the images behind them.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/new')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                    >
                        <Plus size={15} /> New banner
                    </button>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <button
                                key={stat.label}
                                onClick={() => navigate(stat.path)}
                                className="group bg-[#15151c] border border-[#2a2a35] rounded-xl p-5 text-left hover:border-red-500/60 transition"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                                        <Icon size={17} />
                                    </span>
                                    <ArrowRight size={15} className="text-gray-600 group-hover:text-red-400 transition" />
                                </div>
                                <div className="mt-3 text-2xl font-bold text-gray-50">
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : stat.value}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
                    {/* Recent banners */}
                    <div className="bg-[#15151c] border border-[#2a2a35] rounded-xl p-5 h-fit">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-100">Recent banners</h2>
                            <button
                                onClick={() => navigate('/banners')}
                                className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1"
                            >
                                View all <ArrowRight size={11} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-12 flex justify-center text-gray-500">
                                <Loader2 size={18} className="animate-spin" />
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-sm text-gray-400">No banners yet.</p>
                                <button
                                    onClick={() => navigate('/new')}
                                    className="mt-3 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                                >
                                    Create your first banner
                                </button>
                            </div>
                        ) : (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {projects.slice(0, 6).map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => navigate(`/banners/${project.id}`)}
                                        className="group flex items-center gap-3 p-2.5 rounded-lg border border-[#232330] bg-[#1a1a21] hover:border-red-500/60 transition text-left"
                                    >
                                        <TemplateThumb
                                            width={project.canvasWidth}
                                            height={project.canvasHeight}
                                            thumbnailUrl={project.thumbnailUrl}
                                            animated={project.mode === 'animated'}
                                            maxHeight={54}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[13px] font-medium text-gray-100 truncate group-hover:text-red-400 transition">
                                                {project.name}
                                            </div>
                                            <div className="text-[11px] text-gray-400 mt-0.5">
                                                {project.canvasWidth}×{project.canvasHeight} · {formatRelativeTime(project.updatedAt)}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-[#15151c] border border-[#2a2a35] rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-100">Your templates</h2>
                                <button
                                    onClick={() => navigate('/templates')}
                                    className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1"
                                >
                                    Manage <ArrowRight size={11} />
                                </button>
                            </div>

                            {templates.length === 0 ? (
                                <div className="mt-4 text-[12px] text-gray-500 leading-relaxed">
                                    <p>
                                        No saved templates yet. Save a banner as a template to reuse its layout, animations and images.
                                    </p>
                                    <div className="mt-3 space-y-1.5">
                                        {BANNER_TEMPLATES.slice(0, 2).map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => {
                                                    loadTemplate(
                                                        template.elements,
                                                        template.width,
                                                        template.height,
                                                        template.totalDuration,
                                                    );
                                                    navigate('/builder');
                                                }}
                                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#232330] bg-[#1a1a21] text-left hover:border-red-500/60 transition"
                                            >
                                                <Play size={12} className="text-red-400 shrink-0" />
                                                <span className="text-[12px] text-gray-200 truncate">{template.name}</span>
                                                <span className="ml-auto text-[10px] text-gray-500 shrink-0">
                                                    {template.width}×{template.height}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <ul className="mt-4 space-y-2">
                                    {templates.slice(0, 4).map((template) => (
                                        <li key={template.id}>
                                            <button
                                                onClick={() => handleUseTemplate(template.id)}
                                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-[#232330] bg-[#1a1a21] text-left hover:border-red-500/60 transition"
                                            >
                                                <Bookmark size={13} className="text-red-400 shrink-0" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-[12px] text-gray-100 truncate">{template.name}</span>
                                                    <span className="block text-[10px] text-gray-500">
                                                        {template.canvasWidth}×{template.canvasHeight} · {template.category}
                                                    </span>
                                                </span>
                                                <Play size={12} className="text-gray-500 shrink-0" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="bg-[#15151c] border border-[#2a2a35] rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-100">Recent images</h2>
                                <button
                                    onClick={() => navigate('/images')}
                                    className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1"
                                >
                                    Library <ArrowRight size={11} />
                                </button>
                            </div>
                            {assets.length === 0 ? (
                                <p className="mt-4 text-[12px] text-gray-500">
                                    No images uploaded yet — add images in the editor or the image library.
                                </p>
                            ) : (
                                <div className="mt-4 grid grid-cols-4 gap-2">
                                    {assets.slice(0, 8).map((asset) => (
                                        <img
                                            key={asset.id}
                                            src={asset.downloadUrl}
                                            alt={asset.name}
                                            title={asset.name}
                                            className="aspect-square w-full object-cover rounded-md border border-[#232330]"
                                            loading="lazy"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
};
