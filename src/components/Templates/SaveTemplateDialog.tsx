import React, { useState } from 'react';
import { Bookmark, Loader2, X } from 'lucide-react';

export interface SaveTemplateValues {
    name: string;
    description: string;
    category: string;
}

interface SaveTemplateDialogProps {
    isOpen: boolean;
    defaultName: string;
    isSaving?: boolean;
    onClose: () => void;
    onSubmit: (values: SaveTemplateValues) => void;
}

const CATEGORY_SUGGESTIONS = ['Saved', 'Medical', 'Animated', 'Campaign', 'EMR'];

/**
 * Captures the current design as a reusable banner template — the banner-tool
 * equivalent of the email builder's "save as template" flow.
 */
export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
    isOpen,
    defaultName,
    isSaving = false,
    onClose,
    onSubmit,
}) => {
    const [name, setName] = useState(defaultName);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Saved');

    if (!isOpen) return null;

    const resetForm = () => {
        setName(defaultName);
        setDescription('');
        setCategory('Saved');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onSubmit({ name: trimmed, description: description.trim(), category: category.trim() || 'Saved' });
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60" onClick={handleClose}>
            <form
                onSubmit={handleSubmit}
                className="bg-[#15151c] border border-[#2a2a35] rounded-xl shadow-2xl w-[440px] max-w-[92vw]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#232330]">
                    <div className="flex items-center gap-2">
                        <Bookmark size={16} className="text-red-500" />
                        <div>
                            <h3 className="font-semibold text-sm text-gray-50">Save as template</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Stores this banner (all sizes, animations and images) in the template library.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={handleClose} className="text-gray-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-3">
                    <div>
                        <label className="text-[11px] text-gray-400 mb-1 block">Template name</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. EMR launch 300x250"
                            className="w-full border border-[#2a2a35] rounded-md px-3 py-2 text-sm bg-[#1a1a21] text-gray-100 focus:border-red-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-gray-400 mb-1 block">Category</label>
                        <input
                            type="text"
                            list="template-category-suggestions"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full border border-[#2a2a35] rounded-md px-3 py-2 text-sm bg-[#1a1a21] text-gray-100 focus:border-red-500 focus:outline-none"
                        />
                        <datalist id="template-category-suggestions">
                            {CATEGORY_SUGGESTIONS.map((c) => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label className="text-[11px] text-gray-400 mb-1 block">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="When should this template be reused?"
                            className="w-full border border-[#2a2a35] rounded-md px-3 py-2 text-sm bg-[#1a1a21] text-gray-100 focus:border-red-500 focus:outline-none resize-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#232330]">
                    <button type="button" onClick={handleClose} className="px-3 py-1.5 text-sm text-gray-400 hover:bg-[#26262f] rounded-md">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || !name.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-40"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
                        {isSaving ? 'Saving...' : 'Save template'}
                    </button>
                </div>
            </form>
        </div>
    );
};
