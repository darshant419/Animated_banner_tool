import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Plus,
    LayoutGrid,
    Sparkles,
    Loader2,
    Clock,
    Users,
} from 'lucide-react';
import {
    listProjects,
    deleteProject,
    cloneProject,
    CLIENTS,
    type BannerProject,
    type ClientName,
} from '../../services/projectsService';
import { CreateBannerModal } from './CreateBannerModal';
import { EditBannerModal } from './EditBannerModal';
import { BannerCard } from './BannerCard';

interface Props {
    onOpenProject: (project: BannerProject) => void;
}

type FilterClient = ClientName | 'all';

export const Dashboard: React.FC<Props> = ({ onOpenProject }) => {
    const [projects, setProjects] = useState<BannerProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterClient, setFilterClient] = useState<FilterClient>('all');
    const [showCreate, setShowCreate] = useState(false);
    const [editProject, setEditProject] = useState<BannerProject | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<BannerProject | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        const data = await listProjects();
        setProjects(data);
        setLoading(false);
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    // ── Derived data ──────────────────────────────────────────────────────────
    const recent = projects.slice(0, 6);

    const filtered = projects.filter((p) => {
        const matchSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.clientName.toLowerCase().includes(search.toLowerCase());
        const matchClient = filterClient === 'all' || p.clientName === filterClient;
        return matchSearch && matchClient;
    });

    // Group by client
    const grouped: Record<string, BannerProject[]> = {};
    filtered.forEach((p) => {
        if (!grouped[p.clientName]) grouped[p.clientName] = [];
        grouped[p.clientName].push(p);
    });
    const clientGroups = Object.keys(grouped).sort();

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleCreated = (p: BannerProject) => {
        setShowCreate(false);
        onOpenProject(p);
    };

    const handleClone = async (p: BannerProject) => {
        await cloneProject(p.id);
        refresh();
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        await deleteProject(deleteConfirm.id);
        setDeleteConfirm(null);
        refresh();
    };

    const handleUpdated = (updated: BannerProject) => {
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setEditProject(null);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-[#080810] text-white overflow-hidden">
            {/* ── Header ── */}
            <header className="shrink-0 bg-[#0c0c18]/95 backdrop-blur-xl border-b border-slate-700/40 px-8 py-0 flex items-center h-16 gap-6">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40">
                        <LayoutGrid size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="font-bold text-white text-sm leading-none">Banner Studio</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Animated HTML5 Builder</div>
                    </div>
                </div>

                <div className="h-6 w-px bg-slate-600/50" />

                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                        type="text"
                        placeholder="Search banners or clients…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-600/40 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:bg-slate-800/80 transition"
                    />
                </div>

                <div className="flex-1" />

                {/* New Banner */}
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-red-900/30"
                >
                    <Plus size={16} />
                    New Banner
                </button>
            </header>

            {/* ── Body ── */}
            <div className="flex flex-1 min-h-0">
                {/* ── Sidebar ── */}
                <aside className="w-52 shrink-0 bg-[#0e0e1a] border-r border-slate-700/35 flex flex-col py-6 px-3 gap-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Clients</p>
                    <SidebarItem
                        label="All Clients"
                        count={projects.length}
                        active={filterClient === 'all'}
                        onClick={() => setFilterClient('all')}
                        icon={<Users size={14} />}
                    />
                    {CLIENTS.map((c) => {
                        const count = projects.filter((p) => p.clientName === c).length;
                        return (
                            <SidebarItem
                                key={c}
                                label={c}
                                count={count}
                                active={filterClient === c}
                                onClick={() => setFilterClient(c)}
                            />
                        );
                    })}
                </aside>

                {/* ── Main content ── */}
                <main className="flex-1 overflow-y-auto px-8 py-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="text-sm">Loading projects…</span>
                        </div>
                    ) : projects.length === 0 ? (
                        <EmptyState onNew={() => setShowCreate(true)} />
                    ) : (
                        <>
                            {/* Recent */}
                            {search === '' && filterClient === 'all' && recent.length > 0 && (
                                <section className="mb-8">
                                    <SectionHeader
                                        icon={<Clock size={14} />}
                                        title="Recent"
                                        subtitle={`Last ${recent.length} updated`}
                                    />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                        {recent.map((p) => (
                                            <BannerCard
                                                key={p.id}
                                                project={p}
                                                onOpen={onOpenProject}
                                                onEdit={setEditProject}
                                                onClone={handleClone}
                                                onDelete={setDeleteConfirm}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Grouped by client */}
                            {clientGroups.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <Search size={32} className="mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">No banners match your search</p>
                                </div>
                            ) : (
                                clientGroups.map((clientName) => (
                                    <section key={clientName} className="mb-8">
                                        <SectionHeader
                                            title={clientName}
                                            subtitle={`${grouped[clientName].length} banner${grouped[clientName].length !== 1 ? 's' : ''}`}
                                            icon={
                                                <span className="w-5 h-5 rounded-md bg-gradient-to-br from-red-600/30 to-red-800/30 flex items-center justify-center text-[10px] font-bold text-red-400">
                                                    {clientName[0]}
                                                </span>
                                            }
                                        />
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                            {grouped[clientName].map((p) => (
                                                <BannerCard
                                                    key={p.id}
                                                    project={p}
                                                    onOpen={onOpenProject}
                                                    onEdit={setEditProject}
                                                    onClone={handleClone}
                                                    onDelete={setDeleteConfirm}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ))
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* ── Modals ── */}
            {showCreate && (
                <CreateBannerModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />
            )}
            {editProject && (
                <EditBannerModal
                    project={editProject}
                    onUpdated={handleUpdated}
                    onClose={() => setEditProject(null)}
                />
            )}
            {deleteConfirm && (
                <DeleteConfirmDialog
                    project={deleteConfirm}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SidebarItem: React.FC<{
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
}> = ({ label, count, active, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${
            active
                ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/40 border border-transparent'
        }`}
    >
        <span className="flex items-center gap-2">
            {icon}
            {label}
        </span>
        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-red-500/25 text-red-300' : 'bg-slate-700/60 text-slate-400'}`}>
            {count}
        </span>
    </button>
);

const SectionHeader: React.FC<{ title: string; subtitle: string; icon?: React.ReactNode }> = ({
    title,
    subtitle,
    icon,
}) => (
    <div className="flex items-center gap-3 mb-4">
        {icon && <span className="text-slate-400">{icon}</span>}
        <div>
            <h2 className="font-bold text-slate-100 text-sm">{title}</h2>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <div className="flex-1 h-px bg-slate-700/40 ml-2" />
    </div>
);

const EmptyState: React.FC<{ onNew: () => void }> = ({ onNew }) => (
    <div className="flex flex-col items-center justify-center h-96 gap-5 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-red-600/20 to-red-900/20 rounded-3xl flex items-center justify-center border border-red-500/20">
            <Sparkles size={36} className="text-red-500/60" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-white mb-2">No banners yet</h2>
            <p className="text-sm text-gray-500 max-w-xs">
                Create your first animated or EMR banner to get started.
            </p>
        </div>
        <button
            onClick={onNew}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-red-900/30"
        >
            <Plus size={16} />
            Create Your First Banner
        </button>
    </div>
);

const DeleteConfirmDialog: React.FC<{
    project: BannerProject;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ project, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
        <div className="bg-[#13131f] rounded-2xl border border-slate-700/50 w-[380px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
                <span className="text-xl">🗑️</span>
            </div>
            <h3 className="font-bold text-slate-100 text-base mb-1">Delete Banner?</h3>
            <p className="text-sm text-slate-400 mb-5">
                <span className="text-white font-medium">"{project.name}"</span> will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition">
                    Cancel
                </button>
                <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                    Delete
                </button>
            </div>
        </div>
    </div>
);
