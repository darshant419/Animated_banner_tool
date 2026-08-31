import React, { useState, useRef } from 'react';
import { Search, Upload, Image as ImageIcon, Video, Film, X } from 'lucide-react';
import { useDesignStore } from '../../store/designStore';

let assetIdCounter = 0;
const nextElementId = () => `el-asset-${++assetIdCounter}`;

const STORAGE_KEY = 'banner_tool_uploaded_assets';

interface UploadedAsset {
    id: string;
    name: string;
    dataUrl: string;
    type: string;
    size: number;
    addedAt: number;
}

export const AssetsPanel: React.FC = () => {
    const { addElement } = useDesignStore();
    const [search, setSearch] = useState('');
    const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to load uploaded assets:', e);
        }
        return [];
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const saveUploadedAssets = (assets: UploadedAsset[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
            setUploadedAssets(assets);
        } catch (e) {
            console.warn('Failed to save uploaded assets:', e);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const allowedTypes = ['image/', 'video/'];
        const validFiles = Array.from(files).filter(file => 
            allowedTypes.some(type => file.type.startsWith(type))
        );

        if (validFiles.length === 0) {
            alert('Please select valid image or video files');
            return;
        }

        const newAssets: UploadedAsset[] = validFiles.map(file => ({
            id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            dataUrl: '',
            type: file.type,
            size: file.size,
            addedAt: Date.now(),
        }));

        const readers = newAssets.map((asset, i) => {
            return new Promise<UploadedAsset>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    resolve({ ...asset, dataUrl: event.target?.result as string });
                };
                reader.readAsDataURL(validFiles[i]);
            });
        });

        Promise.all(readers).then((loadedAssets) => {
            saveUploadedAssets([...loadedAssets, ...uploadedAssets]);
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const deleteUploadedAsset = (id: string) => {
        saveUploadedAssets(uploadedAssets.filter(a => a.id !== id));
    };

    const addUploadedAsset = (asset: UploadedAsset) => {
        const isVideo = asset.type.startsWith('video/');
        addElement({
            id: nextElementId(),
            type: isVideo ? 'video' : 'image',
            x: 100,
            y: 100,
            width: isVideo ? 320 : 200,
            height: isVideo ? 180 : 150,
            src: asset.dataUrl,
        });
    };

    const filteredUploads = uploadedAssets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    const getFileIcon = (type: string) => {
        if (type.startsWith('video/')) return <Video size={16} className="text-white" />;
        if (type === 'image/gif') return <Film size={16} className="text-white" />;
        return <ImageIcon size={16} className="text-white" />;
    };

    return (
        <div className="w-80 bg-[#15151c] border-r border-[#2a2a35] flex flex-col h-full z-10">
            <div className="p-4 border-b border-[#232330]">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-100">Assets</h2>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium rounded border border-red-500/30 cursor-pointer transition-colors"
                        title="Upload image, video, or GIF">
                        <Upload size={12} />
                        <span>Upload</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input
                        type="text"
                        placeholder="Search uploads..."
                        className="w-full pl-9 pr-4 py-2 bg-[#1a1a21] border border-[#232330] rounded-md text-sm focus:outline-none focus:border-red-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="mt-2 text-[11px] text-gray-500">
                    {uploadedAssets.length} file{uploadedAssets.length !== 1 ? 's' : ''} uploaded
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {filteredUploads.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Upload size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No assets uploaded yet</p>
                        <p className="text-[11px] mt-1">Click Upload to add images, videos, or GIFs</p>
                        <p className="text-[10px] mt-2 opacity-60">Supported: PNG, JPG, WebP, GIF, MP4, WebM</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {filteredUploads.map((asset) => (
                            <div
                                key={asset.id}
                                className="relative aspect-square bg-[#1a1a21] rounded-lg overflow-hidden hover:bg-red-500/10 transition-colors group cursor-pointer"
                                onClick={() => addUploadedAsset(asset)}
                            >
                                {asset.type.startsWith('video/') ? (
                                    <video
                                        src={asset.dataUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="metadata"
                                    />
                                ) : (
                                    <img
                                        src={asset.dataUrl}
                                        alt={asset.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {getFileIcon(asset.type)}
                                    <span className="text-[10px] text-white truncate max-w-[60px]">{asset.name}</span>
                                </div>
                                <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent">
                                    <span className="text-[9px] text-white truncate">{asset.name}</span>
                                    {getFileIcon(asset.type)}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteUploadedAsset(asset.id);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};