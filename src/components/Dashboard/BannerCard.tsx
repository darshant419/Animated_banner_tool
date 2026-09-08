import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Copy, Trash2, Clock, Layout } from 'lucide-react';
import type { BannerProject } from '../../services/projectsService';

interface Props {
    project: BannerProject;
    onOpen: (project: BannerProject) => void;
    onEdit: (project: BannerProject) => void;
    onClone: (project: BannerProject) => void;
    onDelete: (project: BannerProject) => void;
}

function formatDate(ms: number): string {
    const d = new Date(ms);
    const now = new Date();
    const diff = now.getTime() - ms;
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const BannerCard: React.FC<Props> = ({ project, onOpen, onEdit, onClone, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const typeColor = project.bannerType === 'animated'
        ? 'bg-red-500/15 text-red-400 border-red-500/30'
        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

    const typeLabel = project.bannerType === 'animated' ? 'Animated' : 'EMR Static';

    return (
        <div
            className="group relative bg-[#14141f] border border-slate-700/40 rounded-2xl overflow-hidden hover:border-red-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-red-950/30 cursor-pointer"
            onClick={() => onOpen(project)}
        >
            {/* Thumbnail */}
            <div className="relative h-36 bg-[#0f0f1c] flex items-center justify-center overflow-hidden">
                {project.thumbnailUrl ? (
                    <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-600">
                        <Layout size={32} className="opacity-50" />
                        <span className="text-[11px] opacity-60">No preview yet</span>
                    </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                    <span className="text-xs font-semibold text-white bg-red-600 px-3 py-1 rounded-full">
                        Open Editor →
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-100 text-sm truncate leading-tight">{project.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{project.clientName}</p>
                    </div>

                    {/* Three-dot menu */}
                    <div className="relative shrink-0" ref={menuRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                            className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-600/40 rounded-lg transition opacity-0 group-hover:opacity-100"
                        >
                            <MoreVertical size={15} />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-[#12121e] border border-slate-700/50 rounded-xl shadow-2xl z-50 w-36 py-1 overflow-hidden">
                                <MenuItem icon={<Edit2 size={13} />} label="Edit details" onClick={() => { setMenuOpen(false); onEdit(project); }} />
                                <MenuItem icon={<Copy size={13} />} label="Clone" onClick={() => { setMenuOpen(false); onClone(project); }} />
                                <div className="my-1 border-t border-slate-700/50" />
                                <MenuItem icon={<Trash2 size={13} />} label="Delete" onClick={() => { setMenuOpen(false); onDelete(project); }} danger />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeColor}`}>
                        {typeLabel}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock size={10} />
                        {formatDate(project.updatedAt)}
                    </span>
                </div>
            </div>
        </div>
    );
};

const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition ${
            danger
                ? 'text-red-400 hover:bg-red-500/15'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
        }`}
    >
        {icon}
        {label}
    </button>
);
