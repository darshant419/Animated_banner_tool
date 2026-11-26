import { useEffect, useState } from 'react';

/** Reactive `window.matchMedia` — e.g. useMediaQuery('(min-width: 1280px)'). */
export const useMediaQuery = (query: string): boolean => {
    const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false);
    const [matches, setMatches] = useState(get);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);
        onChange();
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);

    return matches;
};

/** Tailwind-aligned breakpoints used by the editor layout. */
export const BREAKPOINTS = {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
} as const;
