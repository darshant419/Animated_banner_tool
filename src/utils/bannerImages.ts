import type { DesignElement } from '../store/designStore';

/**
 * Collects every image/video reference used by a banner so each created banner
 * can keep its own list of related images (mirrors the email builder's asset
 * library being scoped to an emailer).
 *
 * Out-of-line data URLs are skipped — they are already inlined in the element
 * itself and would bloat the Firestore document.
 */

const MAX_URL_LENGTH = 2048;
const MAX_URLS = 50;

const isStorableUrl = (src: string | undefined): src is string => {
    if (!src) return false;
    const trimmed = src.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('data:') && trimmed.length > MAX_URL_LENGTH) return false;
    return trimmed.length <= MAX_URL_LENGTH;
};

export const collectBannerImageUrls = (
    elements: DesignElement[],
    canvasBackgroundImage?: string,
): string[] => {
    const urls = new Set<string>();

    const push = (src?: string) => {
        if (isStorableUrl(src)) urls.add(src.trim());
    };

    push(canvasBackgroundImage);

    for (const el of elements) {
        if (el.visible === false) continue;
        if (el.type === 'image' || el.type === 'video') push(el.src);
        if (el.type === 'isiScroll') push(el.isiLogoSrc);
    }

    return Array.from(urls).slice(0, MAX_URLS);
};
