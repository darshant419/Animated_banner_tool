import React, { useState } from 'react';
import { X, ChevronDown, Layout } from 'lucide-react';
import {
    CLIENTS,
    BANNER_TYPES,
    createProject,
    type ClientName,
    type BannerType,
    type BannerProject,
} from '../../services/projectsService';

interface Props {
    onCreated: (project: BannerProject) => void;
    onClose: () => void;
}

export const CreateBannerModal: React.FC<Props> = ({ onCreated, onClose }) => {
    const [name, setName] = useState('');
    const [client, setClient] = useState<ClientName | ''>('');
    const [type, setType] = useState<BannerType | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const valid = name.trim().length > 0 && client !== '' && type !== '';

    const handleCreate = async () => {
        if (!valid) return;
        setLoading(true);
        setError('');
        try {
            const project = await createProject(
                name.trim(),
                client as ClientName,
                type as BannerType,
            );
            onCreated(project);
        } catch (e) {
            setError('Failed to create project. Please try again.');
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && valid && !loading) handleCreate();
        if (e.key === 'Escape') onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#15151c] rounded-2xl shadow-2xl w-[480px] border border-white/10"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/30">
                            <Layout size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-base leading-tight">New Banner</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Fill in the details to get started</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Banner Name */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                            Banner Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g. Q3 Campaign – Leaderboard"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-[#1a1a24] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition"
                        />
                    </div>

                    {/* Client Name */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                            Client <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <select
                                value={client}
                                onChange={(e) => setClient(e.target.value as ClientName)}
                                className="w-full appearance-none px-4 py-3 bg-[#1a1a24] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition cursor-pointer"
                            >
                                <option value="" disabled className="text-gray-600">Select client…</option>
                                {CLIENTS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <ChevronDown
                                size={16}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                            />
                        </div>
                    </div>

                    {/* Banner Type */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                            Banner Type <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {BANNER_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => setType(t.value)}
                                    className={`flex flex-col items-start px-4 py-3 rounded-xl border text-left transition ${
                                        type === t.value
                                            ? 'border-red-500 bg-red-500/10 text-white'
                                            : 'border-white/10 bg-[#1a1a24] text-gray-400 hover:border-red-500/40 hover:text-gray-200'
                                    }`}
                                >
                                    <span className="text-sm font-semibold">
                                        {t.value === 'animated' ? '🎬' : '📄'}{' '}
                                        {t.value === 'animated' ? 'Animated' : 'EMR Static'}
                                    </span>
                                    <span className="text-[11px] mt-0.5 opacity-70">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!valid || loading}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-900/30"
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating…
                            </>
                        ) : (
                            'Create Banner'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
