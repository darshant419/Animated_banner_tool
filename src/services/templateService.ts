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

/**
 * A reusable banner template — the banner-tool counterpart of the email
 * builder's saved email templates. Templates keep their own artboards (one per
 * size) plus a thumbnail so the gallery can render without loading the canvas.
 */
export interface BannerTemplateDoc {
    id: string;
    name: string;
    description?: string;
    /** Grouping label shown as a chip in the gallery (e.g. "Saved", "Medical"). */
    category: string;
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
    /** Images/videos used by the template — kept in sync so a shared copy still works. */
    imageUrls?: string[];
    /** Project the template was captured from, when applicable. */
    sourceProjectId?: string;
    createdAt: number;
    updatedAt: number;
    version?: number;
}

export type BannerTemplateSummary = Pick<
    BannerTemplateDoc,
    'id' | 'name' | 'description' | 'category' | 'mode' | 'thumbnailUrl' | 'canvasWidth' | 'canvasHeight' | 'updatedAt' | 'createdAt'
>;

const LOCAL_TEMPLATES_KEY = 'banner_tool_banner_templates';

const toSummary = (template: BannerTemplateDoc): BannerTemplateSummary => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    mode: template.mode,
    thumbnailUrl: template.thumbnailUrl,
    canvasWidth: template.canvasWidth,
    canvasHeight: template.canvasHeight,
    updatedAt: template.updatedAt,
    createdAt: template.createdAt,
});

const readLocalTemplates = (): BannerTemplateDoc[] => {
    try {
        const stored = localStorage.getItem(LOCAL_TEMPLATES_KEY);
        return stored ? (JSON.parse(stored) as BannerTemplateDoc[]) : [];
    } catch (e) {
        console.warn('Failed to read local templates:', e);
        return [];
    }
};

const writeLocalTemplates = (templates: BannerTemplateDoc[]) => {
    try {
        localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(templates));
    } catch (e) {
        console.warn('Failed to write local templates:', e);
    }
};

/** Lists every saved banner template as a lightweight summary (newest first). */
export async function listBannerTemplates(): Promise<BannerTemplateSummary[]> {
    if (!isFirebaseConfigured() || !db) {
        return readLocalTemplates()
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            .map(toSummary);
    }

    try {
        const templatesCol = collection(db, 'bannerTemplates');
        const q = query(templatesCol, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                name: data.name || 'Untitled Template',
                description: data.description,
                category: data.category || 'Saved',
                mode: data.mode || 'animated',
                thumbnailUrl: data.thumbnailUrl,
                canvasWidth: data.canvasWidth || 300,
                canvasHeight: data.canvasHeight || 250,
                updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
                createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            };
        });
    } catch (err) {
        console.error('Failed to list banner templates from Firestore:', err);
        return [];
    }
}

/** Loads a full banner template document by id. */
export async function loadBannerTemplate(id: string): Promise<BannerTemplateDoc | null> {
    if (!isFirebaseConfigured() || !db) {
        return readLocalTemplates().find((t) => t.id === id) || null;
    }

    try {
        const snap = await getDoc(doc(db, 'bannerTemplates', id));
        if (!snap.exists()) return null;

        const data = snap.data();
        return {
            id: snap.id,
            name: data.name || 'Untitled Template',
            description: data.description,
            category: data.category || 'Saved',
            mode: data.mode || 'animated',
            thumbnailUrl: data.thumbnailUrl,
            canvasWidth: data.canvasWidth || 300,
            canvasHeight: data.canvasHeight || 250,
            totalDuration: data.totalDuration || 10,
            loop: data.loop ?? true,
            canvasBackground: data.canvasBackground || '#ffffff',
            canvasBackgroundImage: data.canvasBackgroundImage,
            artboards: data.artboards || [],
            elements: data.elements || [],
            imageUrls: data.imageUrls || [],
            sourceProjectId: data.sourceProjectId,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
            version: data.version || 1,
        };
    } catch (err) {
        console.error('Failed to load banner template from Firestore:', err);
        throw err;
    }
}

/** Input accepted by `saveBannerTemplate` (id/version are assigned when omitted). */
export type BannerTemplateInput = Omit<BannerTemplateDoc, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    version?: number;
};

/** Creates or updates a banner template. Returns the template id. */
export async function saveBannerTemplate(template: BannerTemplateInput): Promise<string> {
    const templateId = template.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const payload = {
        ...template,
        id: templateId,
        updatedAt: isFirebaseConfigured() && db ? serverTimestamp() : now,
        version: (template.version || 0) + 1,
    };

    if (!isFirebaseConfigured() || !db) {
        const list = readLocalTemplates();
        const index = list.findIndex((t) => t.id === templateId);
        const stored: BannerTemplateDoc = {
            ...(payload as BannerTemplateDoc),
            updatedAt: now,
            createdAt: index >= 0 ? list[index].createdAt : now,
        };

        if (index >= 0) list[index] = stored;
        else list.unshift(stored);
        writeLocalTemplates(list);
        return templateId;
    }

    try {
        const templateRef = doc(db, 'bannerTemplates', templateId);
        const existing = await getDoc(templateRef);

        if (existing.exists()) {
            await setDoc(templateRef, payload, { merge: true });
        } else {
            await setDoc(templateRef, {
                ...payload,
                createdAt: serverTimestamp(),
            });
        }
        return templateId;
    } catch (err) {
        console.error('Failed to save banner template to Firestore:', err);
        throw err;
    }
}

/** Deletes a banner template by id. */
export async function deleteBannerTemplate(id: string): Promise<void> {
    if (!isFirebaseConfigured() || !db) {
        writeLocalTemplates(readLocalTemplates().filter((t) => t.id !== id));
        return;
    }

    try {
        await deleteDoc(doc(db, 'bannerTemplates', id));
    } catch (err) {
        console.error('Failed to delete banner template from Firestore:', err);
        throw err;
    }
}

/** Copies an existing template into a new " (Copy)" entry. */
export async function duplicateBannerTemplate(id: string): Promise<string | null> {
    const template = await loadBannerTemplate(id);
    if (!template) return null;

    return saveBannerTemplate({
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
    });
}
