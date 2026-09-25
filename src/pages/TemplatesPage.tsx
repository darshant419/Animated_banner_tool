import React, { useEffect, useMemo, useState } from 'react';
import {
    Bookmark,
    Copy,
    Loader2,
    Search,
    Trash2,
    Play,
    Film,
} from 'lucide-react';
import { DashboardShell } from '../components/Shell/DashboardShell';
import { TemplateThumb } from '../components/Templates/TemplateThumb';
import {
    listBannerTemplates,
    loadBannerTemplate,
    deleteBannerTemplate,
    duplicateBannerTemplate,
    saveBannerTemplate,
    type BannerTemplateSummary,
} from '../services/templateService';
import { BANNER_TEMPLATES } from '../templates/emrTemplates';
import { useDesignStore } from '../store/designStore';
import { navigate } from '../router/hashRouter';
import { formatRelativeTime } from '../utils/format';

type TemplateTab = 'saved' | 'built-in';

/**
 * Banner template library — "My templates" (stored in Firestore/localStorage)
 * plus the built-in gallery, mirroring the email builder's Templates and
 * Standard Templates pages.
 */
export const TemplatesPage: React.FC = () => {
    const [tab, setTab] = useState<TemplateTab>('saved');
    const [templates, setTemplates] = useState<BannerTemplateSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { loadTemplate, loadTemplateState } = useDesignStore();

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            setTemplates(await listBannerTemplates());
        } catch (err) {
            console.error('Failed to load banner templates:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const builtInCategories = useMemo(
        () => ['All', ...Array.from(new Set(BANNER_TEMPLATES.map((t) => t.category)))],
        [],
    );

    const filteredSaved = useMemo(
        () => templates.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase())),
        [templates, search],
    );

    const filteredBuiltIn = useMemo(
        () =>
            BANNER_TEMPLATES.filter((t) => {
                const matchesSearch = t.name.toLowerCase().includes(search.trim().toLowerCase());
                const matchesCategory = category === 'All' || t.category === category;
                return matchesSearch && matchesCategory;
            }),
        [search, category],
    );

    const handleUseSaved = async (id: string) => {
        setActionLoading(id);
        try {
            const template = await loadBannerTemplate(id);
            if (!template) {
                alert('Template not found.');
                return;
            }
            loadTemplateState(template);
            navigate('/builder');
        } catch (err) {
            console.error('Failed to open template:', err);
            alert('Failed to open template.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDuplicate = async (id: string) => {
        setActionLoading(id);
        try {
            await duplicateBannerTemplate(id);
            await fetchTemplates();
        } catch (err) {
            console.error('Failed to duplicate template:', err);
            alert('Failed to duplicate template.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (template: BannerTemplateSummary) => {
        if (!confirm(`Delete template "${template.name}"?`)) return;
        setActionLoading(template.id);
        try {
            await deleteBannerTemplate(template.id);
            await fetchTemplates();
        } catch (err) {
            console.error('Failed to delete template:', err);
            alert('Failed to delete template.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveBuiltIn = async (template: typeof BANNER_TEMPLATES[0]) => {
        setActionLoading(template.id);
        try {
            await saveBannerTemplate({
                name: template.name,
                category: template.category,
                mode: template.mode,
                canvasWidth: template.width,
                canvasHeight: template.height,
                totalDuration: template.totalDuration,
                loop: true,
                canvasBackground: '#ffffff',
                artboards: [],
                elements: template.elements,
                description: `Copied from the built-in "${template.name}" template.`,
            });
            setTab('saved');
            await fetchTemplates();
        } catch (err) {
            console.error('Failed to copy template:', err);
            alert('Failed to copy the template to your library.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <DashboardShell activePath="/templates">
            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-50">Banner Templates</h1>
                        <p className="mt-1 text-sm text-gray-400">
                            Reuse a saved design as the starting point for a new banner — sizes, animations and images are kept.
                        </p>
                    </div>
                    <div className="flex items-center gap-1 bg-[#15151c] border border-[#2a2a35] rounded-lg p-1">
                        <button
                            onClick={() => setTab('saved')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                                tab === 'saved' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            My templates ({templates.length})
                        </button>
                        <button
                            onClick={() => setTab('built-in')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                                tab === 'built-in' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Built-in ({BANNER_TEMPLATES.length})
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search templates..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-[#15151c] border border-[#2a2a35] rounded-md text-gray-100 focus:border-red-500 focus:outline-none"
                        />
                    </div>
                    {tab === 'built-in' &&
                        builtInCategories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                    category === cat
                                        ? 'bg-red-600 text-white'
                                        : 'bg-[#15151c] text-gray-400 border border-[#2a2a35] hover:text-gray-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                </div>

                {tab === 'saved' ? (
                    loading ? (
                        <div className="mt-16 flex flex-col items-center text-gray-400 gap-3">
                            <Loader2 size={22} className="animate-spin" />
                            <span className="text-sm">Loading your templates...</span>
                        </div>
                    ) : filteredSaved.length === 0 ? (
                        <div className="mt-16 flex flex-col items-center text-center gap-2">
                            <Bookmark size={28} className="text-gray-600" />
                            <h3 className="text-gray-200 font-semibold">No saved templates yet</h3>
                            <p className="text-sm text-gray-400 max-w-md">
                                Open a banner in the editor and use <span className="text-gray-200">Save as template</span> to store it here
                                for reuse.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredSaved.map((template) => (
                                <div
                                    key={template.id}
                                    className="group bg-[#15151c] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-red-500/60 transition flex flex-col"
                                >
                                    <div className="h-36 bg-[#121217] flex items-center justify-center relative">
                                        <TemplateThumb
                                            width={template.canvasWidth}
                                            height={template.canvasHeight}
                                            thumbnailUrl={template.thumbnailUrl}
                                            animated={template.mode === 'animated'}
                                            maxHeight={120}
                                        />
                                        <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded font-bold bg-white/10 text-gray-200">
                                            {template.category}
                                        </span>
                                    </div>
                                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-semibold text-sm text-gray-100 group-hover:text-red-400 transition truncate">
                                                {template.name}
                                            </h3>
                                            <p className="mt-0.5 text-[11px] text-gray-400">
                                                {template.canvasWidth}×{template.canvasHeight}px ·{' '}
                                                {template.mode === 'animated' ? 'animated' : 'static'} · {formatRelativeTime(template.updatedAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-white/5">
                                            <button
                                                onClick={() => handleUseSaved(template.id)}
                                                disabled={actionLoading === template.id}
                                                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-400 hover:text-white hover:bg-red-600/20 rounded disabled:opacity-40"
                                                title="Use this template"
                                            >
                                                {actionLoading === template.id ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    <Play size={12} />
                                                )}
                                                Use
                                            </button>
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => handleDuplicate(template.id)}
                                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                                title="Duplicate template"
                                            >
                                                <Copy size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template)}
                                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                                                title="Delete template"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredBuiltIn.map((template) => (
                            <div
                                key={template.id}
                                className="group bg-[#15151c] border border-[#2a2a35] rounded-xl p-4 hover:border-red-500/60 transition flex gap-4 items-center"
                            >
                                <TemplateThumb
                                    width={template.width}
                                    height={template.height}
                                    accent={template.accent || '#006937'}
                                    animated={template.mode === 'animated'}
                                    maxHeight={110}
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[13px] font-semibold text-gray-50 leading-tight">{template.name}</h3>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        {template.width} × {template.height}px · {template.totalDuration}s{' '}
                                        {template.mode === 'animated' ? 'loop' : 'static'}
                                    </p>
                                    <span
                                        className={`inline-flex items-center gap-1 mt-1.5 text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                            template.mode === 'animated'
                                                ? 'bg-red-500/10 text-red-400'
                                                : 'bg-emerald-500/10 text-emerald-400'
                                        }`}
                                    >
                                        {template.mode === 'animated' && <Film size={9} />}
                                        {template.mode === 'animated' ? 'Animated' : 'Static'}
                                    </span>
                                    <div className="flex items-center gap-2 mt-3">
                                        <button
                                            onClick={() => {
                                                loadTemplate(
                                                    template.elements,
                                                    template.width,
                                                    template.height,
                                                    template.totalDuration,
                                                );
                                                navigate('/builder');
                                            }}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700"
                                        >
                                            <Play size={11} /> Use
                                        </button>
                                        <button
                                            onClick={() => handleSaveBuiltIn(template)}
                                            disabled={actionLoading === template.id}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#2a2a35] text-gray-300 hover:text-white hover:border-red-500/60 disabled:opacity-40"
                                            title="Copy into my templates"
                                        >
                                            {actionLoading === template.id ? (
                                                <Loader2 size={11} className="animate-spin" />
                                            ) : (
                                                <Bookmark size={11} />
                                            )}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
};

