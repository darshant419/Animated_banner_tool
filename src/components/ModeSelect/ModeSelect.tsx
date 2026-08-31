import React from 'react';
import { ArrowRight, Layout, Sparkles } from 'lucide-react';

export type AppMode = 'emr' | 'animated';

type ModeSelectProps = {
    onSelect: (mode: AppMode) => void;
};

export const ModeSelect: React.FC<ModeSelectProps> = ({ onSelect }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-[#15151c] to-[#1a1a21]">
            <div className="mx-auto max-w-5xl px-6 py-14">
                <div className="flex items-center justify-between gap-6 flex-wrap">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#2a2a35] bg-[#15151c] px-3 py-1 text-xs text-gray-400 shadow-sm">
                            <Sparkles size={14} className="text-red-500" />
                            Choose your workflow
                        </div>
                        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-50">
                            Banner Tool
                        </h1>
                        <p className="mt-2 text-gray-400 max-w-xl">
                            Pick a starting point. You can switch modes anytime.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                        <Layout size={18} />
                        <span className="text-sm font-medium">Design / Preview / Export</span>
                    </div>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        type="button"
                        onClick={() => onSelect('emr')}
                        className="group text-left rounded-2xl border border-[#2a2a35] bg-[#15151c] p-6 shadow-sm hover:shadow-md hover:border-red-500 transition"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 inline-flex px-2 py-1 rounded-full">
                                    EMR
                                </div>
                                <h2 className="mt-3 text-lg font-semibold text-gray-50">
                                    EMR Banner (Static)
                                </h2>
                                <p className="mt-2 text-sm text-gray-400">
                                    Start with the EMR standard layout + ISI scroll area.
                                </p>
                            </div>
                            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition">
                                <ArrowRight size={18} />
                            </div>
                        </div>
                        <div className="mt-6 rounded-xl border border-[#2a2a35] bg-[#1a1a21] p-4">
                            <div className="text-xs text-gray-500">Default size</div>
                            <div className="mt-1 text-sm font-semibold text-gray-100">300 x 250</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelect('animated')}
                        className="group text-left rounded-2xl border border-[#2a2a35] bg-[#15151c] p-6 shadow-sm hover:shadow-md hover:border-red-500 transition"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold text-red-400 bg-red-500/10 inline-flex px-2 py-1 rounded-full">
                                    Animated
                                </div>
                                <h2 className="mt-3 text-lg font-semibold text-gray-50">
                                    Animated Banner
                                </h2>
                                <p className="mt-2 text-sm text-gray-400">
                                    Start with an animated multi-frame sequence, then customize.
                                </p>
                            </div>
                            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition">
                                <ArrowRight size={18} />
                            </div>
                        </div>
                        <div className="mt-6 rounded-xl border border-[#2a2a35] bg-[#1a1a21] p-4">
                            <div className="text-xs text-gray-500">Includes</div>
                            <div className="mt-1 text-sm font-semibold text-gray-100">Frames / Animations / ISI</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
