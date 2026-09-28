import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMediaAssetMock = vi.hoisted(() => vi.fn());
const setDocMock = vi.hoisted(() => vi.fn());
const serverTimestampMock = vi.hoisted(() => vi.fn(() => 'server-timestamp'));

vi.mock('../services/firebase', () => ({
    isFirebaseConfigured: () => true,
    db: {},
}));

vi.mock('../services/storageService', () => ({
    uploadMediaAsset: uploadMediaAssetMock,
    deleteMediaAsset: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(() => 'asset-ref'),
    setDoc: setDocMock,
    deleteDoc: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: serverTimestampMock,
}));

const makeFile = (): File => ({
    name: 'hero.png',
    type: 'image/png',
    size: 1234,
} as File);

describe('assetService upload metadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        uploadMediaAssetMock.mockResolvedValue({
            downloadUrl: 'https://cdn.example.com/hero.png',
            storagePath: 'assets/hero.png',
        });
    });

    it('omits projectId for an unlinked library upload', async () => {
        const { uploadAndSaveAsset } = await import('./assetService');

        await uploadAndSaveAsset(makeFile());

        const payload = setDocMock.mock.calls[0][1];
        expect(payload).toMatchObject({
            name: 'hero.png',
            downloadUrl: 'https://cdn.example.com/hero.png',
            storagePath: 'assets/hero.png',
        });
        expect(payload).not.toHaveProperty('projectId');
        expect(serverTimestampMock).toHaveBeenCalledOnce();
    });

    it('keeps projectId for an asset uploaded from a banner editor', async () => {
        const { uploadAndSaveAsset } = await import('./assetService');

        await uploadAndSaveAsset(makeFile(), undefined, 'proj_123');

        expect(setDocMock.mock.calls[0][1]).toHaveProperty('projectId', 'proj_123');
    });
});
