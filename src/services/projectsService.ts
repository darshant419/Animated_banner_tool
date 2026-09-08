/**
 * projectsService.ts
 *
 * Mock implementation backed by localStorage.
 * When Firebase credentials are available, replace the bodies of these
 * functions with Firestore / Storage calls — the API surface stays identical.
 */

import type { Artboard } from '../store/designStore';

// ─── Constants ───────────────────────────────────────────────────────────────

export const CLIENTS = ['Orserdu', 'Elzonris', 'Ferring', 'Idorsia'] as const;
export type ClientName = typeof CLIENTS[number];

export const BANNER_TYPES = [
    { value: 'animated', label: 'Animated Banner (HTML5)' },
    { value: 'emr', label: 'EMR Banner (Static)' },
] as const;
export type BannerType = 'animated' | 'emr';

const OWNER = 'studio-user'; // placeholder — replace with auth.currentUser.uid later
const STORAGE_KEY = 'banner_studio_projects';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DesignSnapshot {
    artboards: Artboard[];
    canvasBackground: string;
    canvasBackgroundImage?: string;
    totalDuration: number;
    loop: boolean;
    activeArtboardId: string;
}

export interface BannerProject {
    id: string;
    name: string;
    clientName: ClientName;
    bannerType: BannerType;
    owner: string;
    createdAt: number;   // epoch ms
    updatedAt: number;
    thumbnailUrl: string | null;
    designState: DesignSnapshot | null;
}

// ─── Local-storage helpers ────────────────────────────────────────────────────

function readAll(): BannerProject[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as BannerProject[]) : [];
    } catch {
        return [];
    }
}

function writeAll(projects: BannerProject[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

// ─── API ─────────────────────────────────────────────────────────────────────

/** List all projects belonging to the placeholder owner. */
export async function listProjects(): Promise<BannerProject[]> {
    const all = readAll();
    return all.filter((p) => p.owner === OWNER).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Create a new stub project (no design state yet). */
export async function createProject(
    name: string,
    clientName: ClientName,
    bannerType: BannerType,
): Promise<BannerProject> {
    const now = Date.now();
    const project: BannerProject = {
        id: `proj-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        clientName,
        bannerType,
        owner: OWNER,
        createdAt: now,
        updatedAt: now,
        thumbnailUrl: null,
        designState: null,
    };
    const all = readAll();
    writeAll([...all, project]);
    return project;
}

/** Overwrite design state (and optionally thumbnail) for an existing project. */
export async function saveProject(
    id: string,
    designState: DesignSnapshot,
    thumbnailUrl?: string,
): Promise<void> {
    const all = readAll();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project ${id} not found`);
    all[idx] = {
        ...all[idx],
        designState,
        updatedAt: Date.now(),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
    };
    writeAll(all);
}

/** Update only metadata fields (name / client / type). */
export async function updateProjectMeta(
    id: string,
    updates: Partial<Pick<BannerProject, 'name' | 'clientName' | 'bannerType'>>,
): Promise<void> {
    const all = readAll();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project ${id} not found`);
    all[idx] = { ...all[idx], ...updates, updatedAt: Date.now() };
    writeAll(all);
}

/** Load a single project by id. */
export async function loadProject(id: string): Promise<BannerProject | null> {
    return readAll().find((p) => p.id === id) ?? null;
}

/** Delete a project permanently. */
export async function deleteProject(id: string): Promise<void> {
    writeAll(readAll().filter((p) => p.id !== id));
}

/** Deep-clone a project with a new id and "(Copy)" suffix. */
export async function cloneProject(id: string): Promise<BannerProject> {
    const source = readAll().find((p) => p.id === id);
    if (!source) throw new Error(`Project ${id} not found`);
    const now = Date.now();
    const clone: BannerProject = {
        ...source,
        id: `proj-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
    };
    const all = readAll();
    writeAll([...all, clone]);
    return clone;
}
