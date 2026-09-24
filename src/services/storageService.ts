import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';

export interface UploadResult {
    downloadUrl: string;
    storagePath: string;
}

/**
 * Upload an asset file (image, video, GIF) to Firebase Storage.
 */
export async function uploadMediaAsset(
    file: File,
    onProgress?: (progressPercent: number) => void
): Promise<UploadResult> {
    if (!isFirebaseConfigured() || !storage) {
        console.warn('Firebase Storage is not configured. Falling back to base64 DataURL.');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                resolve({
                    downloadUrl: dataUrl,
                    storagePath: `local/${Date.now()}_${file.name}`,
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `assets/${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
    });

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                if (snapshot.totalBytes > 0 && onProgress) {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(Math.round(progress));
                }
            },
            (error) => {
                console.error('Firebase Storage upload failed:', error);
                reject(error);
            },
            async () => {
                try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({ downloadUrl, storagePath });
                } catch (err) {
                    reject(err);
                }
            }
        );
    });
}

/**
 * Delete a media asset from Firebase Storage.
 */
export async function deleteMediaAsset(storagePath: string): Promise<void> {
    if (!isFirebaseConfigured() || !storage || storagePath.startsWith('local/')) {
        return;
    }

    try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
    } catch (err: any) {
        // Ignore if file doesn't exist anymore
        if (err?.code !== 'storage/object-not-found') {
            console.error('Failed to delete file from Firebase Storage:', err);
            throw err;
        }
    }
}

/**
 * Uploads a thumbnail preview (blob or base64 dataUrl) for a project.
 */
export async function uploadProjectThumbnail(
    imageBlobOrDataUrl: Blob | string,
    projectId: string
): Promise<string> {
    if (!isFirebaseConfigured() || !storage) {
        if (typeof imageBlobOrDataUrl === 'string') return imageBlobOrDataUrl;
        return URL.createObjectURL(imageBlobOrDataUrl);
    }

    let blob: Blob;
    if (typeof imageBlobOrDataUrl === 'string') {
        const res = await fetch(imageBlobOrDataUrl);
        blob = await res.blob();
    } else {
        blob = imageBlobOrDataUrl;
    }

    const storagePath = `thumbnails/${projectId}.webp`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = await uploadBytesResumable(storageRef, blob, {
        contentType: 'image/webp',
    });

    return getDownloadURL(uploadTask.ref);
}
