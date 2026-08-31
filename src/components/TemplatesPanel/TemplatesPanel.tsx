import React from 'react';
import { CheckCircle, Film, LayoutTemplate } from 'lucide-react';
import { useDesignStore } from '../../store/designStore';
import { BANNER_TEMPLATES } from '../../templates/emrTemplates';

const CATEGORIES = ['All', ...Array.from(new Set(BANNER_TEMPLATES.map((t) => t.category)))];

const TemplateThumb: React.FC<{ width: number; height: number; accent: string; animated: boolean }> = ({ width, height, accent, animated }) => {
    const ratio = height / width;
    const maxH = 120;
    const w = Math.min(240, maxH / ratio);
    const h = Math.min(maxH, w * ratio);
    const isiPct = 35;
    return (
        <div
            className="rounded-md overflow-hidden relative border border-white/10 shadow-sm shrink-0"
            style={{ width, height: h, background: 'linear-gradient(135deg, #e2e8f0, #f8fafc)' }}
        >
            <div className="absolute inset-0 flex items-center justify-center" style={{ top: 0, height: `${100 - isiPct}%` }}>
                <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${accent}22`, color: accent }}>
                    {width}×{height}
                </span>
            </div>
            <div
                className="absolute inset-x-0 bottom-0 flex items-center px-2 text-[7px] text-gray-500"
                style={{ height: `${isiPct}%`, background: '#f1f5f9', borderTop: `2px solid ${accent}` }}
            >
                <span className="truncate">ISI scroll area</span>
            </div>
            {animated && (
                <span className="absolute top-1 right-1 bg-[#15151c]/90 rounded px-1 py-0.5 flex items-center gap-0.5 text-[7px] font-semibold text-red-500 shadow-sm">
                    <Film size={8} /> ANIM
                </span>
            )}
        </div>
    );
};

export const TemplatesPanel: React.FC = () => {
    const { loadTemplate } = useDesignStore();
    const [category, setCategory] = React.useState('All');

    const templates = category === 'All'
        ? BANNER_TEMPLATES
        : BANNER_TEMPLATES.filter((t) => t.category === category);

    const handleLoadTemplate = (template: typeof BANNER_TEMPLATES[0]) => {
        loadTemplate(template.elements, template.width, template.height, template.totalDuration);
    };

    return (
        <div className="w-80 bg-[#15151c] border-r border-[#2a2a35] flex flex-col h-full z-10">
            <div className="p-4 border-b border-[#232330]">
                <div className="flex items-center gap-2 mb-3">
                    <LayoutTemplate size={16} className="text-red-500" />
                    <h2 className="text-sm font-semibold text-gray-100">Template Gallery</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${category === cat
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-[#1e1e26] text-gray-400 hover:bg-[#2e2e38]'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-3">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => handleLoadTemplate(template)}
                            className="p-3 bg-[#15151c] rounded-xl border border-[#2a2a35] hover:border-red-500 hover:shadow-md transition-all group flex gap-3 items-center text-left"
                        >
                            <TemplateThumb
                                width={template.width}
                                height={template.height}
                                accent={template.accent || '#006937'}
                                animated={template.mode === 'animated'}
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] font-semibold text-gray-50 leading-tight">{template.name}</h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">{template.width} × {template.height}px · {template.totalDuration}s {template.mode === 'animated' ? 'loop' : 'static'}</p>
                                <span className={`inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded font-semibold ${template.mode === 'animated' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-50 text-emerald-700'}`}>
                                    {template.mode === 'animated' ? 'Animated' : 'Static'}
                                </span>
                            </div>
                            <div className="bg-[#15151c] p-1.5 rounded-full shadow-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <CheckCircle size={16} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};