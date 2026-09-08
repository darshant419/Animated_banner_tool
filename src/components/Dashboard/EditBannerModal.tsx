import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import {
    CLIENTS,
    BANNER_TYPES,
    updateProjectMeta,
    type ClientName,
    type BannerType,
    type BannerProject,
} from '../../services/projectsService';

interface Props {
    project: BannerProject;
    onUpdated: (updated: BannerProject) => void;
    onClose: () => void;
}

export const EditBannerModal: React.FC<Props> = ({ project, onUpdated, onClose }) => {
    const [name, setName] = useState(project.name);
    const [client, setClient] = useState<ClientName>(project.clientName);
    const [type, setType] = useState<BannerType>(project.bannerType);
    const [loading, setLoading] = useState(false);

    const valid = name.trim().length > 0;

    const handleSave = async () => {
        if (!valid) return;
        setLoading(true);
        await updateProjectMeta(project.id, { name: name.trim(), clientName: client, bannerType: type });
        onUpdated({ ...project, name: name.trim(), clientName: client, bannerType: type });
    };

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#15151c] rounded-2xl shadow-2xl w-[440px] border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="font-bold text-white text-sm">Edit Banner Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Banner Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#1a1a24] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Client</label>
                        <div className="relative">
                            <select
                                value={client}
                                onChange={(e) => setClient(e.target.value as ClientName)}
                                className="w-full appearance-none px-4 py-2.5 bg-[#1a1a24] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/60 transition cursor-pointer"
                            >
                                {CLIENTS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Banner Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {BANNER_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => setType(t.value)}
                                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                                        type === t.value
                                            ? 'border-red-500 bg-red-500/10 text-white'
                                            : 'border-white/10 text-gray-400 hover:border-red-500/40'
                                    }`}
                                >
                                    {t.value === 'animated' ? '🎬' : '📄'} {t.value === 'animated' ? 'Animated' : 'EMR Static'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!valid || loading}
                        className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition disabled:opacity-40"
                    >
                        {loading ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
