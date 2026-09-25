import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Upload,
    Search,
    Trash2,
    Copy,
    Loader2,
    Image as ImageIcon,
    Video,
    ExternalLink,
    Cloud,
    HardDrive,
} from 'lucide-react';
import { DashboardShell } from '../components/Shell/DashboardShell';
import {
    subscribeToAssets,
    uploadAndSaveAsset,
    deleteAsset,
    type FirebaseAsset,
} from '../services/assetService';
import { listProjects } from '../services/projectService';
import { isFirebaseConfigured } from '../services/firebase';
import { navigate } from '../router/hashRouter';
import { formatFileSize, formatRelativeTime } from '../utils/format';

/**
 * Image library — every image/video uploaded for a banner, with the banner it
 * belongs to (mirrors the email builder's Asset Library).
 */
export const ImagesPage: React.FC = () => {
    const [assets, setAssets] = useState<FirebaseAsset[]>([]);
    const [bannerNames, setBannerNames] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [onlyLinked, setOnlyLinked] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isCloud = isFirebaseConfigured();

    useEffect(() => {
        const unsubscribe = subscribeToAssets(setAssets);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        listProjects()
            .then((projects) => {
                setBannerNames(Object.fromEntries(projects.map((p) => [p.id, p.name])));
            })
            .catch((err) => console.warn('Could not load banner names for the image library:', err));
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
        if (validFiles.length === 0) {
            alert('Please select image or video files.');
            return;
        }

        setUploadProgress(0);
        try {
            for (let i = 0; i < validFiles.length; i += 1) {
                await uploadAndSaveAsset(validFiles[i], (pct) => {
                    setUploadProgress(Math.round(((i + pct / 100) / validFiles.length) * 100));
                });
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('One or more files failed to upload.');
        } finally {
            setUploadProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (asset: FirebaseAsset) => {
        if (!confirm(`Delete "${asset.name}" from the library?`)) return;
        setIsDeleting(asset.id);
        try {
            await deleteAsset(asset);
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete the image.');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleCopyUrl = async (asset: FirebaseAsset) => {
        try {
            await navigator.clipboard.writeText(asset.downloadUrl);
        } catch {
            alert('Could not copy the URL — copy it from the image preview instead.');
        }
    };

    const filtered = useMemo(
        () =>
            assets.filter((asset) => {
                const matchesSearch = asset.name.toLowerCase().includes(search.trim().toLowerCase());
                const matchesLink = !onlyLinked || Boolean(asset.projectId);
                return matchesSearch && matchesLink;
            }),
        [assets, search, onlyLinked],
    );

    const linkedCount = assets.filter((a) => a.projectId).length;

    return (
        <DashboardShell activePath="/images">
            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-50">Image Library</h1>
                        <p className="mt-1 text-sm text-gray-400">
                            {assets.length} file{assets.length !== 1 ? 's' : ''} · {linkedCount} used by a banner
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold border ${
                                isCloud
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                        >
                            {isCloud ? <Cloud size={10} /> : <HardDrive size={10} />}
                            {isCloud ? 'Firebase Storage' : 'Local (base64)'}
                        </span>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadProgress !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                        >
                            {uploadProgress !== null ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            {uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Upload images'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleUpload}
                            className="hidden"
                        />
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search images..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-[#15151c] border border-[#2a2a35] rounded-md text-gray-100 focus:border-red-500 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setOnlyLinked((v) => !v)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                            onlyLinked
                                ? 'bg-red-600 text-white'
                                : 'bg-[#15151c] text-gray-400 border border-[#2a2a35] hover:text-gray-200'
                        }`}
                    >
                        Used by a banner
                    </button>
                </div>

                {uploadProgress !== null && (
                    <div className="mt-4 h-1.5 w-full bg-[#232330] rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                )}

                {filtered.length === 0 ? (
                    <div className="mt-16 flex flex-col items-center text-center gap-2">
                        <ImageIcon size={30} className="text-gray-600" />
                        <h3 className="text-gray-200 font-semibold">No images yet</h3>
                        <p className="text-sm text-gray-400 max-w-sm">
                            Upload images here, or straight from the editor — images uploaded for a banner are linked to its page.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filtered.map((asset) => {
                            const isVideo = asset.type.startsWith('video/');
                            const bannerName = asset.projectId ? bannerNames[asset.projectId] : undefined;
                            return (
                                <div
                                    key={asset.id}
                                    className="group bg-[#15151c] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-red-500/60 transition flex flex-col"
                                >
                                    <div className="aspect-square bg-[#121217] relative flex items-center justify-center">
                                        {isVideo ? (
                                            <video src={asset.downloadUrl} muted playsInline className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={asset.downloadUrl} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
                                        )}
                                        <span className="absolute top-1.5 left-1.5 bg-black/70 rounded px-1.5 py-0.5 text-[9px] text-gray-200 flex items-center gap-1">
                                            {isVideo ? <Video size={9} /> : <ImageIcon size={9} />}
                                            {formatFileSize(asset.size)}
                                        </span>
                                    </div>
                                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-medium text-gray-200 truncate" title={asset.name}>
                                                {asset.name}
                                            </p>
                                            <p className="text-[10px] text-gray-500">{formatRelativeTime(asset.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                                            {bannerName ? (
                                                <button
                                                    onClick={() => navigate(`/banners/${asset.projectId}`)}
                                                    className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 truncate"
                                                    title={`Open ${bannerName}`}
                                                >
                                                    <ExternalLink size={10} />
                                                    <span className="truncate max-w-[90px]">{bannerName}</span>
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-gray-500">Library</span>
                                            )}
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => handleCopyUrl(asset)}
                                                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                                title="Copy image URL"
                                            >
                                                <Copy size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(asset)}
                                                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                                                title="Delete image"
                                            >
                                                {isDeleting === asset.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
};
