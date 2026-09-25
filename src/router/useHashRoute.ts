import { useEffect, useState } from 'react';
import { parseHash, type ParsedRoute } from './hashRouter';

/**
 * Subscribes to the location hash and returns the current route.
 * Declared as an object rather than a string so re-renders only happen
 * when the parsed path/query actually changes.
 */
export const useHashRoute = (): ParsedRoute => {
    const read = (): ParsedRoute =>
        typeof window === 'undefined'
            ? { path: '/', query: {} }
            : parseHash(window.location.hash);

    const [route, setRoute] = useState<ParsedRoute>(read);

    useEffect(() => {
        const handleChange = () => setRoute(read());

        window.addEventListener('hashchange', handleChange);
        // Normalize an empty hash to '#/' so links keep working after a refresh.
        if (!window.location.hash) {
            window.location.hash = '#/';
        } else {
            handleChange();
        }

        return () => window.removeEventListener('hashchange', handleChange);
    }, []);

    return route;
};
