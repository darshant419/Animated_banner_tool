import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMediaAssetMock = vi.hoisted(() => vi.fn());
const setDocMock = vi.hoisted(() => vi.fn());
const serverTimestampMock = vi.hoisted(() => vi.fn(() => 'server-timestamp'));
const docMock = vi.hoisted(() => vi.fn(() => 'asset-ref'));

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
    doc: docMock,
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

        expect(uploadMediaAssetMock).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'hero.png', type: 'image/png', size: 1234 }),
            undefined,
            undefined
        );
        const payload = setDocMock.mock.calls[0][1];
        expect(payload).toMatchObject({
            name: 'hero.png',
            downloadUrl: 'https://cdn.example.com/hero.png',
            storagePath: 'assets/hero.png',
        });
        expect(payload).not.toHaveProperty('projectId');
        expect(serverTimestampMock).toHaveBeenCalledOnce();
        expect(docMock).toHaveBeenCalledWith(expect.anything(), 'assets', expect.stringContaining('asset_'));
    });

    it('keeps projectId for an asset uploaded from a banner editor', async () => {
        const { uploadAndSaveAsset } = await import('./assetService');

        await uploadAndSaveAsset(makeFile(), undefined, 'proj_123');

        expect(uploadMediaAssetMock).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'hero.png', type: 'image/png', size: 1234 }),
            undefined,
            'proj_123'
        );
        expect(setDocMock.mock.calls[0][1]).toHaveProperty('projectId', 'proj_123');
        expect(docMock).toHaveBeenCalledWith(
            expect.anything(),
            'projects/proj_123/assets',
            expect.stringContaining('asset_')
        );
    });

    it('stores project upload under projects/{projectId}/assets in Storage', async () => {
        const { uploadAndSaveAsset } = await import('./assetService');

        uploadMediaAssetMock.mockResolvedValue({
            downloadUrl: 'https://cdn.example.com/hero.png',
            storagePath: 'projects/proj_123/assets/1234567890_hero.png',
        });

        await uploadAndSaveAsset(makeFile(), undefined, 'proj_123');

        const [file, , projId] = uploadMediaAssetMock.mock.calls[0];
        expect(projId).toBe('proj_123');
        const payload = setDocMock.mock.calls[0][1];
        expect(payload.storagePath).toBe('projects/proj_123/assets/1234567890_hero.png');
    });
});
