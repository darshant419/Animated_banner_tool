import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { Artboard, DesignElement } from '../store/designStore';

export interface FirebaseProject {
    id: string;
    name: string;
    mode: 'emr' | 'animated';
    thumbnailUrl?: string;
    canvasWidth: number;
    canvasHeight: number;
    totalDuration: number;
    loop: boolean;
    canvasBackground: string;
    canvasBackgroundImage?: string;
    artboards: Artboard[];
    elements: DesignElement[];
    createdAt: number;
    updatedAt: number;
    version: number;
}

export type ProjectSummary = Pick<
    FirebaseProject,
    'id' | 'name' | 'mode' | 'thumbnailUrl' | 'canvasWidth' | 'canvasHeight' | 'updatedAt' | 'createdAt'
>;

const LOCAL_PROJECTS_KEY = 'banner_tool_saved_projects';

/**
 * Fetch all projects as lightweight summaries.
 */
export async function listProjects(): Promise<ProjectSummary[]> {
    if (!isFirebaseConfigured() || !db) {
        try {
            const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
            if (!stored) return [];
            const list: FirebaseProject[] = JSON.parse(stored);
            return list.map((p) => ({
                id: p.id,
                name: p.name,
                mode: p.mode,
                thumbnailUrl: p.thumbnailUrl,
                canvasWidth: p.canvasWidth,
                canvasHeight: p.canvasHeight,
                updatedAt: p.updatedAt || Date.now(),
                createdAt: p.createdAt || Date.now(),
            }));
        } catch (e) {
            console.warn('Failed to load local projects:', e);
            return [];
        }
    }

    try {
        const projectsCol = collection(db, 'projects');
        const q = query(projectsCol, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                name: data.name || 'Untitled Banner',
                mode: data.mode || 'animated',
                thumbnailUrl: data.thumbnailUrl,
                canvasWidth: data.canvasWidth || 300,
                canvasHeight: data.canvasHeight || 250,
                updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
                createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            };
        });
    } catch (err) {
        console.error('Failed to list projects from Firestore:', err);
        return [];
    }
}

/**
 * Load a full project document by ID.
 */
export async function loadProject(id: string): Promise<FirebaseProject | null> {
    if (!isFirebaseConfigured() || !db) {
        try {
            const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
            if (!stored) return null;
            const list: FirebaseProject[] = JSON.parse(stored);
            return list.find((p) => p.id === id) || null;
        } catch (e) {
            console.warn('Failed to load local project:', e);
            return null;
        }
    }

    try {
        const projectRef = doc(db, 'projects', id);
        const snap = await getDoc(projectRef);
        if (!snap.exists()) return null;

        const data = snap.data();
        return {
            id: snap.id,
            name: data.name || 'Untitled Banner',
            mode: data.mode || 'animated',
            thumbnailUrl: data.thumbnailUrl,
            canvasWidth: data.canvasWidth,
            canvasHeight: data.canvasHeight,
            totalDuration: data.totalDuration || 10,
            loop: data.loop ?? true,
            canvasBackground: data.canvasBackground || '#ffffff',
            canvasBackgroundImage: data.canvasBackgroundImage,
            artboards: data.artboards || [],
            elements: data.elements || [],
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
            version: data.version || 1,
        };
    } catch (err) {
        console.error('Failed to load project from Firestore:', err);
        throw err;
    }
}

/**
 * Save or update a project in Firestore.
 */
export async function saveProjectToFirestore(
    project: Omit<FirebaseProject, 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
    const projectId = project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const payload = {
        ...project,
        id: projectId,
        updatedAt: isFirebaseConfigured() && db ? serverTimestamp() : now,
        version: (project.version || 0) + 1,
    };

    if (!isFirebaseConfigured() || !db) {
        try {
            const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
            const list: FirebaseProject[] = stored ? JSON.parse(stored) : [];
            const index = list.findIndex((p) => p.id === projectId);
            const projectObj: FirebaseProject = {
                ...payload,
                updatedAt: now,
                createdAt: index >= 0 ? list[index].createdAt : now,
            } as FirebaseProject;

            if (index >= 0) {
                list[index] = projectObj;
            } else {
                list.unshift(projectObj);
            }
            localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn('Failed to save local project:', e);
        }
        return projectId;
    }

    try {
        const projectRef = doc(db, 'projects', projectId);
        const existing = await getDoc(projectRef);

        if (existing.exists()) {
            await setDoc(projectRef, payload, { merge: true });
        } else {
            await setDoc(projectRef, {
                ...payload,
                createdAt: serverTimestamp(),
            });
        }
        return projectId;
    } catch (err) {
        console.error('Failed to save project to Firestore:', err);
        throw err;
    }
}

/**
 * Delete a project by ID.
 */
export async function deleteProject(id: string): Promise<void> {
    if (!isFirebaseConfigured() || !db) {
        try {
            const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
            if (stored) {
                const list: FirebaseProject[] = JSON.parse(stored).filter((p) => p.id !== id);
                localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(list));
            }
        } catch (e) {
            console.warn('Failed to delete local project:', e);
        }
        return;
    }

    try {
        const projectRef = doc(db, 'projects', id);
        await deleteDoc(projectRef);
    } catch (err) {
        console.error('Failed to delete project from Firestore:', err);
        throw err;
    }
}
