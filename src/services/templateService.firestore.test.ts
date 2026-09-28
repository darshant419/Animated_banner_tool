import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BannerTemplateInput } from './templateService';

const getDocMock = vi.hoisted(() => vi.fn());
const setDocMock = vi.hoisted(() => vi.fn());
const serverTimestampMock = vi.hoisted(() => vi.fn(() => 'server-timestamp'));

vi.mock('./firebase', () => ({
    isFirebaseConfigured: () => true,
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(() => 'template-ref'),
    getDoc: getDocMock,
    getDocs: vi.fn(),
    setDoc: setDocMock,
    deleteDoc: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: serverTimestampMock,
}));

const makeTemplate = (): BannerTemplateInput => ({
    name: 'Launch Template',
    description: undefined,
    category: 'Saved',
    mode: 'animated',
    thumbnailUrl: undefined,
    canvasWidth: 300,
    canvasHeight: 250,
    totalDuration: 10,
    loop: true,
    canvasBackground: '#ffffff',
    canvasBackgroundImage: undefined,
    artboards: [],
    elements: [
        {
            id: 'el-1',
            type: 'text',
            x: 0,
            y: 0,
            text: 'Hello',
            anim: {
                keyframes: [
                    {
                        id: 'keyframe-1',
                        time: 0,
                        opacity: undefined,
                        easing: 'power2.out',
                    },
                ],
            },
        },
    ],
    imageUrls: ['https://cdn.example.com/hero.png'],
    sourceProjectId: undefined,
});

describe('templateService Firestore saves', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getDocMock.mockResolvedValue({ exists: () => false });
        setDocMock.mockResolvedValue(undefined);
    });

    it('omits undefined optional fields, including nested fields, before saving', async () => {
        const { saveBannerTemplate } = await import('./templateService');

        const id = await saveBannerTemplate(makeTemplate());
        const payload = setDocMock.mock.calls[0][1];

        expect(id).toBeTruthy();
        expect(payload).not.toHaveProperty('description');
        expect(payload).not.toHaveProperty('thumbnailUrl');
        expect(payload).not.toHaveProperty('canvasBackgroundImage');
        expect(payload).not.toHaveProperty('sourceProjectId');
        expect(payload.elements[0].anim.keyframes[0]).not.toHaveProperty('opacity');
        expect(payload.elements[0].anim.keyframes[0].easing).toBe('power2.out');
        expect(serverTimestampMock).toHaveBeenCalled();
    });
});
