import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/firebase', () => ({
    isFirebaseConfigured: () => false,
    db: null,
}));

const memoryStore: Record<string, string> = {};

vi.stubGlobal('localStorage', {
    getItem: (key: string) => memoryStore[key] ?? null,
    setItem: (key: string, value: string) => {
        memoryStore[key] = value;
    },
    removeItem: (key: string) => {
        delete memoryStore[key];
    },
    clear: () => {
        for (const key of Object.keys(memoryStore)) delete memoryStore[key];
    },
});

const template = (overrides = {}) => ({
    id: 'tpl_1',
    name: 'Launch Banner',
    description: 'Seasonal launch',
    category: 'Saved',
    mode: 'animated' as const,
    thumbnailUrl: 'https://cdn.example.com/thumb.webp',
    canvasWidth: 300,
    canvasHeight: 250,
    totalDuration: 12,
    loop: true,
    canvasBackground: '#ffffff',
    canvasBackgroundImage: undefined,
    artboards: [],
    elements: [],
    imageUrls: ['https://cdn.example.com/hero.png'],
    sourceProjectId: 'proj_1',
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
});

describe('templateService local fallback', () => {
    beforeEach(async () => {
        localStorage.clear();
        vi.resetModules();
    });

    it('saves, lists, loads, duplicates and deletes templates', async () => {
        const service = await import('./templateService');

        const id = await service.saveBannerTemplate(template({ id: undefined }));
        expect(id.startsWith('tpl_')).toBe(true);

        const list = await service.listBannerTemplates();
        expect(list).toHaveLength(1);
        expect(list[0]).toMatchObject({ id, name: 'Launch Banner', category: 'Saved' });

        const loaded = await service.loadBannerTemplate(id);
        expect(loaded).toMatchObject({ id, name: 'Launch Banner' });
        expect(loaded?.imageUrls).toEqual(['https://cdn.example.com/hero.png']);

        const copyId = await service.duplicateBannerTemplate(id);
        expect(copyId).not.toBe(id);
        expect(await service.listBannerTemplates()).toHaveLength(2);

        await service.deleteBannerTemplate(id);
        const remaining = await service.listBannerTemplates();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe(copyId);
    });

    it('returns templates newest first and null for unknown ids', async () => {
        const service = await import('./templateService');

        await service.saveBannerTemplate(template({ id: 'tpl_old', name: 'Older', createdAt: 100, updatedAt: 100 }));
        await service.saveBannerTemplate(template({ id: 'tpl_new', name: 'Newer', createdAt: 300, updatedAt: 300 }));

        const list = await service.listBannerTemplates();
        expect(list.map((entry) => entry.id)).toEqual(['tpl_new', 'tpl_old']);
        expect(await service.loadBannerTemplate('missing')).toBeNull();
        expect(await service.duplicateBannerTemplate('missing')).toBeNull();
    });
});
