import { describe, it, expect } from 'vitest';
import { matchPath, parseHash, toHash } from './hashRouter';

describe('hashRouter', () => {
    it('normalizes route strings into hashes', () => {
        expect(toHash('banners')).toBe('#/banners');
        expect(toHash('/banners')).toBe('#/banners');
        expect(toHash('#/banners')).toBe('#/banners');
        expect(toHash('')).toBe('#/');
    });

    it('parses paths, trims slashes and decodes queries', () => {
        expect(parseHash('#/builder?mode=emr')).toEqual({ path: '/builder', query: { mode: 'emr' } });
        expect(parseHash('#/banners/')).toEqual({ path: '/banners', query: {} });
        expect(parseHash('')).toEqual({ path: '/', query: {} });
    });

    it('matches static and parameterized routes', () => {
        expect(matchPath('/banners', '/banners')).toEqual({});
        expect(matchPath('/banners', '/templates')).toBeNull();
        expect(matchPath('/banners/proj_123', '/banners/:id')).toEqual({ id: 'proj_123' });
        expect(matchPath('/builder/tpl_1?mode=emr', '/builder/:id')).toEqual({ id: 'tpl_1' });
        expect(matchPath('/banners/proj_123/extra', '/banners/:id')).toBeNull();
    });
});
