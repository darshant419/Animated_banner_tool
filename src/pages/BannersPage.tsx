import React, { useEffect, useMemo, useState } from 'react';
import {
    Copy,
    Trash2,
    Search,
    Loader2,
    FolderOpen,
    Clock,
    PenSquare,
    Eye,
    ArrowUpRight,
    Layout,
} from 'lucide-react';
import { DashboardShell } from '../components/Shell/DashboardShell';
import { TemplateThumb } from '../components/Templates/TemplateThumb';
import {
    listProjects,
    loadProject,
    deleteProject,
    saveProjectToFirestore,
    type ProjectSummary,
} from '../services/projectService';
import { isFirebaseConfigured } from '../services/firebase';
import { navigate } from '../router/hashRouter';
import { formatRelativeTime } from '../utils/format';

type ModeFilter = 'all' | 'animated' | 'emr';

/**
 * "My Banners" — every created banner gets its own page (mirrors the email
 * builder's emailer/template list). Each card links to that banner's page.
 */
export const BannersPage: React.FC = () => {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const isCloud = isFirebaseConfigured();

    const fetchProjects = async () => {
        setLoading(true);
        try {
            setProjects(await listProjects());
        } catch (err) {
            console.error('Failed to load banners:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const filtered = useMemo(
        () =>
            projects.filter((project) => {
                const matchesSearch = project.name.toLowerCase().includes(search.trim().toLowerCase());
                const matchesMode = modeFilter === 'all' || project.mode === modeFilter;
                return matchesSearch && matchesMode;
            }),
        [projects, search, modeFilter],
    );

    const handleDuplicate = async (e: React.MouseEvent, project: ProjectSummary) => {
        e.stopPropagation();
        setActionLoading(project.id);
        try {
            const full = await loadProject(project.id);
            if (!full) return;
            await saveProjectToFirestore({
                ...full,
                id: undefined,
                name: `${full.name} (Copy)`,
            });
            await fetchProjects();
        } catch (err) {
            console.error('Failed to duplicate banner:', err);
            alert('Failed to duplicate banner.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (e: React.MouseEvent, project: ProjectSummary) => {
        e.stopPropagation();
        if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

        setActionLoading(project.id);
        try {
            await deleteProject(project.id);
            await fetchProjects();
        } catch (err) {
            console.error('Failed to delete banner:', err);
            alert('Failed to delete banner.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <DashboardShell activePath="/banners">
            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-50">My Banners</h1>
                        <p className="mt-1 text-sm text-gray-400">
                            {projects.length} created banner{projects.length !== 1 ? 's' : ''} · each one has its own page with a live preview.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-[10px] px-2 py-1 rounded-full font-bold border ${
                                isCloud
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                        >
                            {isCloud ? 'Firestore synced' : 'Local storage'}
                        </span>
                        <button
                            onClick={() => navigate('/new')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                        >
                            <Layout size={13} />
                            Create banner
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
                            placeholder="Search banners..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-[#15151c] border border-[#2a2a35] rounded-md text-gray-100 focus:border-red-500 focus:outline-none"
                        />
                    </div>
                    {(['all', 'animated', 'emr'] as ModeFilter[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setModeFilter(mode)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                                modeFilter === mode
                                    ? 'bg-red-600 text-white'
                                    : 'bg-[#15151c] text-gray-400 border border-[#2a2a35] hover:text-gray-200'
                            }`}
                        >
                            {mode === 'all' ? 'All' : mode === 'animated' ? 'Animated' : 'EMR'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="mt-16 flex flex-col items-center text-gray-400 gap-3">
                        <Loader2 size={22} className="animate-spin" />
                        <span className="text-sm">Loading banners...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="mt-16 flex flex-col items-center text-center gap-2">
                        <FolderOpen size={30} className="text-gray-600" />
                        <h3 className="text-gray-200 font-semibold">No banners yet</h3>
                        <p className="text-sm text-gray-400 max-w-sm">
                            Create a banner in the studio, save it, and it will appear here with its own page.
                        </p>
                        <button
                            onClick={() => navigate('/new')}
                            className="mt-2 px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                        >
                            Create your first banner
                        </button>
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => navigate(`/banners/${project.id}`)}
                                className="group bg-[#15151c] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-red-500/60 cursor-pointer transition flex flex-col"
                            >
                                <div className="h-36 bg-[#121217] flex items-center justify-center overflow-hidden relative">
                                    <TemplateThumb
                                        width={project.canvasWidth}
                                        height={project.canvasHeight}
                                        thumbnailUrl={project.thumbnailUrl}
                                        animated={project.mode === 'animated'}
                                        maxHeight={120}
                                    />
                                    <span
                                        className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                            project.mode === 'animated'
                                                ? 'bg-red-500/15 text-red-400'
                                                : 'bg-emerald-500/15 text-emerald-400'
                                        }`}
                                    >
                                        {project.mode === 'animated' ? 'ANIMATED' : 'EMR'}
                                    </span>
                                </div>

                                <div className="p-3.5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold text-sm text-gray-100 group-hover:text-red-400 transition truncate">
                                            {project.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                            <span>{project.canvasWidth}×{project.canvasHeight}px</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={10} /> {formatRelativeTime(project.updatedAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-white/5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/builder/${project.id}`);
                                            }}
                                            className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-300 hover:text-white hover:bg-white/10 rounded"
                                            title="Open in editor"
                                        >
                                            <PenSquare size={12} /> Edit
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/banners/${project.id}`);
                                            }}
                                            className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-300 hover:text-white hover:bg-white/10 rounded"
                                            title="Open banner page"
                                        >
                                            <Eye size={12} /> Page
                                        </button>
                                        <div className="flex-1" />
                                        <button
                                            onClick={(e) => handleDuplicate(e, project)}
                                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                            title="Duplicate banner"
                                        >
                                            {actionLoading === project.id ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, project)}
                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                                            title="Delete banner"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                        <ArrowUpRight size={13} className="text-gray-600 group-hover:text-red-400 ml-1" />
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
