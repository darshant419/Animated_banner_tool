import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FirebaseProject } from './projectService';

const getDocMock = vi.hoisted(() => vi.fn());
const setDocMock = vi.hoisted(() => vi.fn());
const serverTimestampMock = vi.hoisted(() => vi.fn(() => 'server-timestamp'));

vi.mock('./firebase', () => ({
    isFirebaseConfigured: () => true,
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(() => 'project-ref'),
    getDoc: getDocMock,
    getDocs: vi.fn(),
    setDoc: setDocMock,
    deleteDoc: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: serverTimestampMock,
}));

const makeProject = () => ({
    name: 'Launch Banner',
    mode: 'animated' as const,
    thumbnailUrl: undefined,
    canvasWidth: 300,
    canvasHeight: 250,
    totalDuration: 10,
    loop: true,
    version: 0,
    canvasBackground: '#ffffff',
    canvasBackgroundImage: undefined,
    artboards: [],
    elements: [
        {
            id: 'el-1',
            type: 'text' as const,
            x: 0,
            y: 0,
            text: 'Hello',
            anim: {
                keyframes: [
                    {
                        id: 'keyframe-1',
                        time: 0,
                        x: undefined,
                        easing: 'power2.out',
                    },
                ],
            },
        },
    ],
    imageUrls: ['https://cdn.example.com/hero.png'],
});

describe('projectService Firestore saves', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getDocMock.mockResolvedValue({ exists: () => false });
        setDocMock.mockResolvedValue(undefined);
    });

    it('omits undefined optional fields, including nested fields, before saving', async () => {
        const { saveProjectToFirestore } = await import('./projectService');
        const input: Omit<FirebaseProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; version?: number } =
            makeProject();

        const id = await saveProjectToFirestore(input);
        const payload = setDocMock.mock.calls[0][1];

        expect(id).toBeTruthy();
        expect(payload).not.toHaveProperty('thumbnailUrl');
        expect(payload).not.toHaveProperty('canvasBackgroundImage');
        expect(payload.elements[0].anim.keyframes[0]).not.toHaveProperty('x');
        expect(payload.elements[0].anim.keyframes[0].easing).toBe('power2.out');
        expect(serverTimestampMock).toHaveBeenCalled();
    });
});
