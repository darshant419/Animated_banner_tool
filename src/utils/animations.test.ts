import { describe, expect, it } from 'vitest';
import {
    getActiveDirection,
    getAnimationGroupsForTab,
    getDirectionVariants,
    getPresetsForTab,
    resolvePresetForDirection,
    splitDirection,
    ANIMISTA_ANIMATIONS,
} from './animations';

const optionIds = (groups: ReturnType<typeof getAnimationGroupsForTab>) =>
    groups.flatMap((group) => group.options.map((option) => option.value));

describe('animation catalog synchronization', () => {
    it('uses the same entrance ids in the Properties panel and Animation Studio', () => {
        const panelIds = optionIds(getAnimationGroupsForTab('in'));
        const studioIds = getPresetsForTab('in').map((preset) => preset.id);

        expect(panelIds.length).toBeGreaterThan(0);
        expect(new Set(panelIds)).toEqual(new Set(studioIds));
    });

    it('uses the same exit ids in the Properties panel and Animation Studio', () => {
        const panelIds = optionIds(getAnimationGroupsForTab('out'));
        const studioIds = getPresetsForTab('out').map((preset) => preset.id);

        expect(panelIds.length).toBeGreaterThan(0);
        expect(new Set(panelIds)).toEqual(new Set(studioIds));
    });
});

describe('animation direction resolution', () => {
    it('splits the longest direction token so corners are not read as edges', () => {
        expect(splitDirection('slide-in-bottom-left')).toEqual({ base: 'slide-in', direction: 'bl' });
        expect(splitDirection('slide-in-top-left')).toEqual({ base: 'slide-in', direction: 'tl' });
        expect(splitDirection('slide-in-top')).toEqual({ base: 'slide-in', direction: 'top' });
    });

    it('returns null for a preset with no direction', () => {
        expect(splitDirection('fade-in')).toBeNull();
        expect(getActiveDirection('fade-in')).toBeNull();
    });

    it('resolves a direction only to ids that really exist in the catalog', () => {
        const variants = getDirectionVariants('slide-in-top');

        expect(variants.top).toBe('slide-in-top');
        // Every resolved id must be a real catalog entry, not a guessed one.
        Object.values(variants).forEach((id) => {
            expect(ANIMISTA_ANIMATIONS[id as string]).toBeDefined();
        });
    });

    it('returns null for a direction the catalog does not define', () => {
        const variants = getDirectionVariants('slide-in-top');
        const missing = (['center', 'top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br'] as const)
            .filter((dir) => !(dir in variants));

        expect(missing.length).toBeGreaterThan(0);
        missing.forEach((dir) => {
            expect(resolvePresetForDirection('slide-in-top', dir)).toBeNull();
        });
    });

    it('maps a bare preset to itself for center when the catalog has no -center variant', () => {
        const resolved = resolvePresetForDirection('fade-in', 'center');
        expect(resolved === null || resolved === 'fade-in').toBe(true);
    });

    it('returns no directions for an unknown preset id', () => {
        expect(getDirectionVariants('not-a-real-preset')).toEqual({});
        expect(resolvePresetForDirection('not-a-real-preset', 'top')).toBeNull();
    });

    it('keeps round-tripping: a resolved direction reports itself as active', () => {
        const variants = getDirectionVariants('slide-in-top');
        (Object.keys(variants) as (keyof typeof variants)[]).forEach((dir) => {
            const id = variants[dir] as string;
            expect(getActiveDirection(id)).toBe(dir);
        });
    });
});
