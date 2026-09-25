import React, { useState, useRef, useEffect } from 'react';
import { Search, Upload, Image as ImageIcon, Video, Film, X, Loader2, Cloud, HardDrive } from 'lucide-react';
import { useDesignStore } from '../../store/designStore';
import {
    subscribeToAssets,
    uploadAndSaveAsset,
    deleteAsset,
    type FirebaseAsset,
} from '../../services/assetService';
import { isFirebaseConfigured } from '../../services/firebase';

let assetIdCounter = 0;
const nextElementId = () => `el-asset-${++assetIdCounter}`;

export const AssetsPanel: React.FC = () => {
    const { addElement, projectId } = useDesignStore();
    const [search, setSearch] = useState('');
    const [assets, setAssets] = useState<FirebaseAsset[]>([]);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isCloud = isFirebaseConfigured();

    useEffect(() => {
        const unsubscribe = subscribeToAssets((loadedAssets) => {
            setAssets(loadedAssets);
        });
        return () => unsubscribe();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const allowedTypes = ['image/', 'video/'];
        const validFiles = Array.from(files).filter((file) =>
            allowedTypes.some((type) => file.type.startsWith(type))
        );

        if (validFiles.length === 0) {
            alert('Please select valid image or video files');
            return;
        }

        setUploadingCount(validFiles.length);
        setUploadProgress(0);

        try {
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                await uploadAndSaveAsset(file, (pct) => {
                    const overall = Math.round(((i + pct / 100) / validFiles.length) * 100);
                    setUploadProgress(overall);
                }, projectId || undefined);
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('One or more files failed to upload. Check console for details.');
        } finally {
            setUploadingCount(0);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAsset = async (asset: FirebaseAsset) => {
        try {
            setIsDeleting(asset.id);
            await deleteAsset(asset);
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete asset.');
        } finally {
            setIsDeleting(null);
        }
    };

    const addUploadedAsset = (asset: FirebaseAsset) => {
        const isVideo = asset.type.startsWith('video/');
        addElement({
            id: nextElementId(),
            type: isVideo ? 'video' : 'image',
            x: 100,
            y: 100,
            width: isVideo ? 320 : 200,
            height: isVideo ? 180 : 150,
            src: asset.downloadUrl,
            name: asset.name,
        });
    };

    const filteredUploads = assets.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    const getFileIcon = (type: string) => {
        if (type.startsWith('video/')) return <Video size={16} className="text-white" />;
        if (type === 'image/gif') return <Film size={16} className="text-white" />;
        return <ImageIcon size={16} className="text-white" />;
    };

    return (
        <div className="w-80 bg-[#15151c] border-r border-[#2a2a35] flex flex-col h-full z-10">
            <div className="p-4 border-b border-[#232330]">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-100">Assets</h2>
                        <span
                            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                isCloud
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                            title={isCloud ? 'Connected to Firebase Storage & Firestore' : 'Running in Local mode. Add Firebase keys in .env for Cloud storage.'}
                        >
                            {isCloud ? <Cloud size={10} /> : <HardDrive size={10} />}
                            {isCloud ? 'Firebase' : 'Local'}
                        </span>
                    </div>
                    <label
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium rounded border border-red-500/30 cursor-pointer transition-colors"
                        title="Upload image, video, or GIF to Cloud Storage"
                    >
                        {uploadingCount > 0 ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Upload size={12} />
                        )}
                        <span>{uploadingCount > 0 ? `Uploading (${uploadProgress}%)` : 'Upload'}</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            disabled={uploadingCount > 0}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>

                {uploadingCount > 0 && (
                    <div className="w-full bg-[#232330] rounded-full h-1.5 mb-3 overflow-hidden">
                        <div
                            className="bg-red-500 h-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                )}

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        className="w-full pl-9 pr-4 py-2 bg-[#1a1a21] border border-[#232330] rounded-md text-sm focus:outline-none focus:border-red-500 text-gray-100 placeholder-gray-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="mt-2 text-[11px] text-gray-500 flex justify-between items-center">
                    <span>{assets.length} file{assets.length !== 1 ? 's' : ''} available</span>
                    {isCloud && <span className="text-blue-400/80 text-[10px]">Cloud Synced</span>}
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
                                className="relative aspect-square bg-[#1a1a21] rounded-lg overflow-hidden hover:bg-red-500/10 transition-colors group cursor-pointer border border-[#232330] hover:border-red-500/50"
                                onClick={() => addUploadedAsset(asset)}
                            >
                                {asset.type.startsWith('video/') ? (
                                    <video
                                        src={asset.downloadUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="metadata"
                                    />
                                ) : (
                                    <img
                                        src={asset.downloadUrl}
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
                                        handleDeleteAsset(asset);
                                    }}
                                    disabled={isDeleting === asset.id}
                                    className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                    title="Delete from Storage"
                                >
                                    {isDeleting === asset.id ? (
                                        <Loader2 size={10} className="animate-spin" />
                                    ) : (
                                        <X size={10} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};