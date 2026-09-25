import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { uploadMediaAsset, deleteMediaAsset } from './storageService';

export interface FirebaseAsset {
    id: string;
    name: string;
    downloadUrl: string;
    storagePath: string;
    type: string;
    size: number;
    dimensions?: { width: number; height: number };
    /** Banner (project) the asset was uploaded for, when uploaded from the editor. */
    projectId?: string;
    createdAt: number;
}

const LOCAL_STORAGE_KEY = 'banner_tool_uploaded_assets';

/**
 * Real-time listener for uploaded assets.
 */
export function subscribeToAssets(
    callback: (assets: FirebaseAsset[]) => void
): () => void {
    if (!isFirebaseConfigured() || !db) {
        // Fallback to localStorage
        const loadLocal = () => {
            try {
                const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
                const list = stored ? JSON.parse(stored) : [];
                callback(
                    list.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        downloadUrl: item.dataUrl || item.downloadUrl,
                        storagePath: item.storagePath || `local/${item.id}`,
                        type: item.type,
                        size: item.size || 0,
                        projectId: item.projectId,
                        createdAt: item.addedAt || item.createdAt || Date.now(),
                    }))
                );
            } catch (err) {
                console.warn('Failed to load local assets:', err);
                callback([]);
            }
        };

        loadLocal();
        const handleStorageChange = () => loadLocal();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-assets-updated', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-assets-updated', handleStorageChange);
        };
    }

    const assetsCol = collection(db, 'assets');
    const q = query(assetsCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
        q,
        (snapshot) => {
            const assets: FirebaseAsset[] = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name,
                    downloadUrl: data.downloadUrl,
                    storagePath: data.storagePath,
                    type: data.type,
                    size: data.size,
                    dimensions: data.dimensions,
                    projectId: data.projectId,
                    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
                };
            });
            callback(assets);
        },
        (error) => {
            console.error('Firestore assets subscription error:', error);
        }
    );
}

/**
 * Upload an asset file and persist its metadata in Firestore.
 */
export async function uploadAndSaveAsset(
    file: File,
    onProgress?: (pct: number) => void,
    projectId?: string
): Promise<FirebaseAsset> {
    const { downloadUrl, storagePath } = await uploadMediaAsset(file, onProgress);
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newAsset: FirebaseAsset = {
        id: assetId,
        name: file.name,
        downloadUrl,
        storagePath,
        type: file.type,
        size: file.size,
        projectId,
        createdAt: Date.now(),
    };

    if (!isFirebaseConfigured() || !db) {
        // Save to localStorage
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            const list = stored ? JSON.parse(stored) : [];
            list.unshift(newAsset);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
            window.dispatchEvent(new Event('local-assets-updated'));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
        return newAsset;
    }

    const assetRef = doc(db, 'assets', assetId);
    await setDoc(assetRef, {
        ...newAsset,
        createdAt: serverTimestamp(),
    });

    return newAsset;
}

/**
 * Delete an asset from both Firestore and Firebase Storage.
 */
export async function deleteAsset(asset: FirebaseAsset): Promise<void> {
    if (asset.storagePath) {
        await deleteMediaAsset(asset.storagePath);
    }

    if (!isFirebaseConfigured() || !db) {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const list = JSON.parse(stored).filter((a: any) => a.id !== asset.id);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
                window.dispatchEvent(new Event('local-assets-updated'));
            }
        } catch (e) {
            console.warn('Could not delete from localStorage:', e);
        }
        return;
    }

    const assetRef = doc(db, 'assets', asset.id);
    await deleteDoc(assetRef);
}
