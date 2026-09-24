import React, { useEffect, useState } from 'react';
import {
    FolderOpen,
    Plus,
    Trash2,
    Copy,
    Clock,
    Layout,
    X,
    Loader2,
    Cloud,
    HardDrive,
    Search,
    Check,
} from 'lucide-react';
import {
    listProjects,
    loadProject,
    deleteProject,
    saveProjectToFirestore,
    type ProjectSummary,
} from '../../services/projectService';
import { isFirebaseConfigured } from '../../services/firebase';
import { useDesignStore } from '../../store/designStore';

interface ProjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({ isOpen, onClose }) => {
    const {
        projectId: activeProjectId,
        loadProjectState,
        reset,
    } = useDesignStore();

    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedTab, setSelectedTab] = useState<'all' | 'animated' | 'emr'>('all');

    const isCloud = isFirebaseConfigured();

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const list = await listProjects();
            setProjects(list);
        } catch (err) {
            console.error('Failed to load projects list:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchProjects();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOpenProject = async (summary: ProjectSummary) => {
        setActionLoading(summary.id);
        try {
            const fullProject = await loadProject(summary.id);
            if (fullProject) {
                loadProjectState(fullProject);
                onClose();
            } else {
                alert('Project not found or could not be loaded.');
            }
        } catch (err) {
            console.error('Failed to open project:', err);
            alert('Failed to load project details.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateNew = () => {
        reset();
        onClose();
    };

    const handleDuplicateProject = async (e: React.MouseEvent, summary: ProjectSummary) => {
        e.stopPropagation();
        setActionLoading(summary.id);
        try {
            const fullProject = await loadProject(summary.id);
            if (fullProject) {
                await saveProjectToFirestore({
                    ...fullProject,
                    name: `${fullProject.name} (Copy)`,
                    id: undefined,
                });
                await fetchProjects();
            }
        } catch (err) {
            console.error('Failed to duplicate project:', err);
            alert('Failed to duplicate project.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteProject = async (e: React.MouseEvent, summary: ProjectSummary) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete "${summary.name}"?`)) return;

        setActionLoading(summary.id);
        try {
            await deleteProject(summary.id);
            setProjects((prev) => prev.filter((p) => p.id !== summary.id));
        } catch (err) {
            console.error('Failed to delete project:', err);
            alert('Failed to delete project.');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = projects.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesTab = selectedTab === 'all' || p.mode === selectedTab;
        return matchesSearch && matchesTab;
    });

    const formatDate = (timestamp: number) => {
        if (!timestamp) return 'Just now';
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-[#15151c] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#232330]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center border border-red-500/20">
                            <FolderOpen size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold">Project Library</h2>
                                <span
                                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        isCloud
                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    }`}
                                >
                                    {isCloud ? <Cloud size={10} /> : <HardDrive size={10} />}
                                    {isCloud ? 'Firestore Cloud' : 'Local Storage'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">Save, open, and manage your animated and EMR banners</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                            <Plus size={14} /> New Banner
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="px-6 py-3 border-b border-[#232330] flex items-center justify-between gap-4 bg-[#181822]">
                    <div className="flex items-center gap-1.5">
                        {(['all', 'animated', 'emr'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setSelectedTab(tab)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                                    selectedTab === tab
                                        ? 'bg-red-600 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-[#121217] border border-[#2a2a35] rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
                        />
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Loader2 size={32} className="animate-spin text-red-500 mb-3" />
                            <p className="text-sm">Fetching banner projects...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Layout size={48} className="mx-auto mb-3 opacity-30" />
                            <h3 className="text-sm font-semibold text-gray-300">No projects found</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                {search
                                    ? 'Try adjusting your search or category filter.'
                                    : 'Click "New Banner" or save your current design to see it stored here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((project) => {
                                const isActive = activeProjectId === project.id;
                                const isBusy = actionLoading === project.id;

                                return (
                                    <div
                                        key={project.id}
                                        onClick={() => handleOpenProject(project)}
                                        className={`group relative bg-[#1a1a24] hover:bg-[#20202d] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col ${
                                            isActive
                                                ? 'border-red-500 ring-1 ring-red-500/50'
                                                : 'border-[#2a2a35] hover:border-red-500/50'
                                        }`}
                                    >
                                        {/* Thumbnail / Aspect Container */}
                                        <div className="h-32 bg-[#101015] relative flex items-center justify-center overflow-hidden border-b border-[#232330]">
                                            {project.thumbnailUrl ? (
                                                <img
                                                    src={project.thumbnailUrl}
                                                    alt={project.name}
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-gray-600 gap-1">
                                                    <Layout size={24} className="opacity-40" />
                                                    <span className="text-[10px] uppercase font-mono">
                                                        {project.canvasWidth} × {project.canvasHeight}
                                                    </span>
                                                </div>
                                            )}

                                            <span
                                                className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow ${
                                                    project.mode === 'emr'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}
                                            >
                                                {project.mode}
                                            </span>

                                            {isActive && (
                                                <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                                                    <Check size={10} /> Active
                                                </span>
                                            )}

                                            {isBusy && (
                                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                    <Loader2 size={24} className="animate-spin text-red-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-semibold text-sm text-gray-100 group-hover:text-red-400 transition truncate">
                                                    {project.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                                    <span>{project.canvasWidth}×{project.canvasHeight}px</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 text-[10px]">
                                                        <Clock size={10} /> {formatDate(project.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleDuplicateProject(e, project)}
                                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                                    title="Duplicate banner"
                                                >
                                                    <Copy size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteProject(e, project)}
                                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                                                    title="Delete banner"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-6 py-3 border-t border-[#232330] bg-[#121217] flex items-center justify-between text-xs text-gray-400">
                    <div>
                        Total {projects.length} banner{projects.length !== 1 ? 's' : ''} saved
                    </div>
                    <div>
                        {isCloud ? (
                            <span className="text-blue-400">Firestore Database Connected</span>
                        ) : (
                            <span className="text-amber-400">Add Firebase credentials to .env for Cloud Sync</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
