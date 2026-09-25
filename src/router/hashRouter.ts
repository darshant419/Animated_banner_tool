/**
 * Tiny dependency-free hash router.
 *
 * The banner tool is a static Vite SPA: every "page" lives behind a
 * `#/route` hash so the app can offer separate, linkable pages
 * (dashboard, banner list, banner preview, templates, image library)
 * without needing a server rewrite rule or an extra routing library.
 */

export interface ParsedRoute {
    /** Route path without the leading '#' or query string, e.g. "/banners/proj_1". */
    path: string;
    /** Parsed query parameters of the hash, e.g. { mode: 'emr' }. */
    query: Record<string, string>;
}

/** Normalizes any route string ("banners", "/banners", "#/banners") into a hash. */
export const toHash = (route: string): string => {
    const trimmed = (route || '/').trim();
    if (trimmed.startsWith('#')) return trimmed;
    return `#${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};

/** Splits a `#/path?query` hash into its path and decoded query params. */
export const parseHash = (hash: string): ParsedRoute => {
    const raw = (hash || '').replace(/^#/, '');
    const [rawPath, rawQuery = ''] = raw.split('?');
    let path = rawPath || '/';
    if (!path.startsWith('/')) path = `/${path}`;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

    const query: Record<string, string> = {};
    new URLSearchParams(rawQuery).forEach((value, key) => {
        query[key] = value;
    });

    return { path, query };
};

/**
 * Matches a route path against a pattern with `:param` placeholders.
 * Returns the extracted params, or null when the path does not match.
 */
export const matchPath = (path: string, pattern: string): Record<string, string> | null => {
    const pathParts = parseHash(path).path.split('/').filter(Boolean);
    const patternParts = parseHash(pattern).path.split('/').filter(Boolean);

    if (pathParts.length !== patternParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i += 1) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];

        if (patternPart.startsWith(':')) {
            params[patternPart.slice(1)] = decodeURIComponent(pathPart);
        } else if (patternPart !== pathPart) {
            return null;
        }
    }

    return params;
};

/** Navigates the browser to a route (hash based, so no page reload). */
export const navigate = (route: string): void => {
    if (typeof window === 'undefined') return;
    const next = toHash(route);
    if (window.location.hash === next) {
        // Same route clicked twice -> still notify listeners so pages can refresh.
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
    }
    window.location.hash = next;
};
